#!/usr/bin/env python3
"""Teste isolado de backup, atualização e restauração de diretórios ChromaDB.

O script nunca modifica a base indicada por --source. Quando uma origem real é
informada, ela é copiada para um diretório temporário e todas as operações são
executadas apenas sobre essa cópia. Sem --source, uma estrutura mínima de
ChromaDB é criada exclusivamente para validar o fluxo de arquivos.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tempfile
from pathlib import Path


UPDATE_MARKER = "__nrv_acceptance_update_marker__.json"


def directory_digest(directory: Path) -> str:
    """Gera uma assinatura determinística da estrutura e conteúdo de um diretório."""
    digest = hashlib.sha256()
    for entry in sorted(directory.rglob("*"), key=lambda item: item.relative_to(directory).as_posix()):
        relative = entry.relative_to(directory).as_posix().encode("utf-8")
        if entry.is_dir():
            digest.update(b"D:")
            digest.update(relative)
            continue

        digest.update(b"F:")
        digest.update(relative)
        with entry.open("rb") as file_handle:
            for chunk in iter(lambda: file_handle.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()


def copy_database(source: Path, destination: Path) -> None:
    if not source.is_dir():
        raise ValueError(f"A origem deve ser um diretório: {source}")
    if not any(source.iterdir()):
        raise ValueError(f"A origem não pode estar vazia: {source}")
    shutil.copytree(source, destination)


def create_fixture(destination: Path) -> None:
    """Cria uma representação mínima para exercitar o ciclo sem uma base real."""
    destination.mkdir(parents=True)
    (destination / "chroma.sqlite3").write_bytes(b"NRV Chroma fixture v1\n")
    collection_dir = destination / "collections" / "nrv-services"
    collection_dir.mkdir(parents=True)
    (collection_dir / "segments.json").write_text(
        json.dumps({"collection": "nrv-services", "documents": 2}, ensure_ascii=False),
        encoding="utf-8",
    )


def run_lifecycle(source: Path | None) -> dict[str, object]:
    """Executa backup, atualização em estágio e restauração sobre cópias temporárias."""
    with tempfile.TemporaryDirectory(prefix="nrv-chromadb-acceptance-") as temporary:
        workspace = Path(temporary)
        source_digest_before: str | None = None

        baseline = workspace / "baseline"
        if source:
            resolved_source = source.expanduser().resolve()
            source_digest_before = directory_digest(resolved_source)
            copy_database(resolved_source, baseline)
        else:
            create_fixture(baseline)

        initial_digest = directory_digest(baseline)
        active = workspace / "active"
        backup = workspace / "backup"
        copy_database(baseline, active)
        copy_database(active, backup)
        backup_digest = directory_digest(backup)

        staging = workspace / "staging"
        copy_database(active, staging)
        (staging / UPDATE_MARKER).write_text(
            json.dumps({"operation": "acceptance-update", "status": "staged"}),
            encoding="utf-8",
        )

        previous = workspace / "before-update"
        active.rename(previous)
        staging.rename(active)
        update_marker_present = (active / UPDATE_MARKER).is_file()
        update_changed_active = directory_digest(active) != initial_digest

        restored_stage = workspace / "restore-stage"
        copy_database(backup, restored_stage)
        updated_version = workspace / "updated-version"
        active.rename(updated_version)
        restored_stage.rename(active)

        restored_digest = directory_digest(active)
        source_unchanged = True
        if source:
            source_unchanged = directory_digest(source.expanduser().resolve()) == source_digest_before

        return {
            "mode": "copied-source" if source else "fixture",
            "backupMatchesInitial": backup_digest == initial_digest,
            "updateMarkerPresent": update_marker_present,
            "updateChangedActive": update_changed_active,
            "restoreMatchesBackup": restored_digest == backup_digest,
            "sourceUnchanged": source_unchanged,
        }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Valida em cópia temporária o ciclo de backup, atualização e restauração do ChromaDB.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        help="Diretório ChromaDB real a copiar e validar sem alterá-lo.",
    )
    args = parser.parse_args()

    report = run_lifecycle(args.source)
    failed = [name for name, value in report.items() if isinstance(value, bool) and not value]
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    if failed:
        raise SystemExit(f"Falha na validação do ciclo ChromaDB: {', '.join(failed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
