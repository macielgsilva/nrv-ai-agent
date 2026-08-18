#!/usr/bin/env python3
"""Backup verificável do ChromaDB para OCI Object Storage.

O script cria um arquivo compactado e um manifesto com assinaturas SHA-256.
Com credenciais de principal de instância, envia ambos ao OCI Object Storage e
aplica retenção somente depois de upload bem-sucedido. Ele não pausa o agente:
use o serviço systemd incluído para interromper brevemente o Streamlit antes
da cópia, garantindo consistência de arquivos.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ARCHIVE_SUFFIX = ".tar.gz"
MANIFEST_SUFFIX = ".manifest.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def directory_digest(directory: Path) -> str:
    digest = hashlib.sha256()
    for entry in sorted(directory.rglob("*"), key=lambda item: item.relative_to(directory).as_posix()):
        relative = entry.relative_to(directory).as_posix().encode("utf-8")
        digest.update(b"D:" if entry.is_dir() else b"F:")
        digest.update(relative)
        if entry.is_file():
            with entry.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
    return digest.hexdigest()


def create_fixture(destination: Path) -> Path:
    """Cria uma estrutura mínima para validar o fluxo sem ChromaDB ou OCI."""
    source = destination / "chroma_db"
    source.mkdir(parents=True)
    (source / "chroma.sqlite3").write_bytes(b"NRV Chroma backup fixture\n")
    collection = source / "collections" / "nrv-services"
    collection.mkdir(parents=True)
    (collection / "segments.json").write_text('{"documents": 2}', encoding="utf-8")
    return source


def create_archive(source: Path, output_dir: Path, backup_id: str) -> tuple[Path, Path, dict[str, Any]]:
    if not source.is_dir() or not any(source.iterdir()):
        raise ValueError(f"A origem ChromaDB precisa ser um diretório não vazio: {source}")

    output_dir.mkdir(parents=True, exist_ok=True)
    archive = output_dir / f"{backup_id}{ARCHIVE_SUFFIX}"
    manifest_path = output_dir / f"{backup_id}{MANIFEST_SUFFIX}"
    if archive.exists() or manifest_path.exists():
        raise FileExistsError(f"Já existe um backup com o identificador {backup_id}.")

    source_digest = directory_digest(source)
    with tarfile.open(archive, "w:gz", dereference=False) as tar_handle:
        tar_handle.add(source, arcname=source.name, recursive=True)
    with tarfile.open(archive, "r:gz") as tar_handle:
        if not tar_handle.getmembers():
            raise ValueError("O arquivo de backup foi criado vazio.")

    manifest = {
        "schemaVersion": 1,
        "backupId": backup_id,
        "createdAt": datetime.now(UTC).isoformat(),
        "sourceDirectory": source.name,
        "sourceDigestSha256": source_digest,
        "archiveFile": archive.name,
        "archiveSha256": sha256_file(archive),
        "archiveBytes": archive.stat().st_size,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return archive, manifest_path, manifest


def run_command(command: list[str]) -> str:
    result = subprocess.run(command, check=True, text=True, capture_output=True)
    return result.stdout


def upload_object(oci_cli: str, namespace: str, bucket: str, object_name: str, file_path: Path) -> None:
    run_command([
        oci_cli, "os", "object", "put", "--auth", "instance_principal",
        "--namespace", namespace, "--bucket-name", bucket, "--name", object_name,
        "--file", str(file_path), "--no-overwrite", "--verify-checksum",
    ])


def object_backup_id(object_name: str) -> str | None:
    if object_name.endswith(ARCHIVE_SUFFIX):
        return object_name[: -len(ARCHIVE_SUFFIX)]
    if object_name.endswith(MANIFEST_SUFFIX):
        return object_name[: -len(MANIFEST_SUFFIX)]
    return None


def list_remote_objects(oci_cli: str, namespace: str, bucket: str, prefix: str) -> list[str]:
    raw = run_command([
        oci_cli, "os", "object", "list", "--auth", "instance_principal",
        "--namespace", namespace, "--bucket-name", bucket, "--prefix", prefix, "--all",
    ])
    payload = json.loads(raw)
    return [entry["name"] for entry in payload.get("data", {}).get("objects", []) if "name" in entry]


def select_expired_objects(object_names: list[str], retention_count: int) -> list[str]:
    groups: dict[str, list[str]] = {}
    for object_name in object_names:
        backup_id = object_backup_id(object_name)
        if backup_id:
            groups.setdefault(backup_id, []).append(object_name)

    retained = set(sorted(groups, reverse=True)[:retention_count])
    return sorted(
        object_name
        for backup_id, names in groups.items()
        if backup_id not in retained
        for object_name in names
    )


def prune_remote(oci_cli: str, namespace: str, bucket: str, prefix: str, retention_count: int) -> list[str]:
    expired = select_expired_objects(list_remote_objects(oci_cli, namespace, bucket, prefix), retention_count)
    for object_name in expired:
        run_command([
            oci_cli, "os", "object", "delete", "--auth", "instance_principal",
            "--namespace", namespace, "--bucket-name", bucket, "--name", object_name, "--force",
        ])
    return expired


def prune_local(output_dir: Path, retention_count: int) -> list[str]:
    object_names = [path.name for path in output_dir.iterdir() if path.is_file()]
    expired = select_expired_objects(object_names, retention_count)
    for name in expired:
        (output_dir / name).unlink(missing_ok=True)
    return expired


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria e envia um backup verificado do ChromaDB ao OCI Object Storage.")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--source", type=Path, help="Diretório ChromaDB a proteger.")
    source_group.add_argument("--fixture", action="store_true", help="Executa apenas o teste local com uma base temporária.")
    parser.add_argument("--output-dir", type=Path, default=Path("/var/backups/nrv-ai-agent/chromadb"))
    parser.add_argument("--namespace", help="Namespace do Object Storage OCI.")
    parser.add_argument("--bucket", help="Bucket OCI de destino.")
    parser.add_argument("--prefix", default="nrv-ai-agent/chromadb/")
    parser.add_argument("--retention-count", type=int, default=14)
    parser.add_argument("--local-retention-count", type=int, default=2)
    parser.add_argument("--oci-cli", default="oci")
    parser.add_argument("--dry-run", action="store_true", help="Cria e valida o arquivo sem contato com a OCI.")
    args = parser.parse_args()

    if args.retention_count < 1 or args.local_retention_count < 1:
        parser.error("As retenções devem ser maiores que zero.")
    if not args.dry_run and (not args.namespace or not args.bucket):
        parser.error("--namespace e --bucket são obrigatórios fora de --dry-run.")

    temporary_context = tempfile.TemporaryDirectory(prefix="nrv-oci-backup-") if args.fixture else None
    try:
        fixture_root = Path(temporary_context.name) if temporary_context else None
        source = create_fixture(fixture_root) if fixture_root else args.source.expanduser().resolve()
        output_dir = (fixture_root / "backups") if fixture_root else args.output_dir.expanduser().resolve()
        backup_id = f"chromadb-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}"
        archive, manifest_path, manifest = create_archive(source, output_dir, backup_id)

        prefix = args.prefix.strip("/") + "/"
        archive_object = prefix + archive.name
        manifest_object = prefix + manifest_path.name
        uploaded = False
        deleted_remote: list[str] = []
        if not args.dry_run:
            upload_object(args.oci_cli, args.namespace, args.bucket, archive_object, archive)
            upload_object(args.oci_cli, args.namespace, args.bucket, manifest_object, manifest_path)
            uploaded = True
            deleted_remote = prune_remote(args.oci_cli, args.namespace, args.bucket, prefix, args.retention_count)

        deleted_local = prune_local(output_dir, args.local_retention_count)
        report = {
            "archiveCreated": archive.is_file(),
            "archiveSha256Valid": sha256_file(archive) == manifest["archiveSha256"],
            "backupId": backup_id,
            "dryRun": args.dry_run,
            "fixture": args.fixture,
            "localRetentionDeleted": deleted_local,
            "manifestCreated": manifest_path.is_file(),
            "remoteRetentionDeleted": deleted_remote,
            "uploaded": uploaded,
        }
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0
    finally:
        if temporary_context:
            temporary_context.cleanup()


if __name__ == "__main__":
    raise SystemExit(main())
