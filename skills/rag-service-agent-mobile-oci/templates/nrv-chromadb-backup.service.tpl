[Unit]
Description=Backup verificado do ChromaDB NRV para OCI Object Storage
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/nrv-ai-agent/chromadb-backup.env
ExecStartPre=/usr/bin/systemctl stop nrv-ai-agent.service
ExecStart=/usr/bin/python3 /opt/nrv-ai-agent/scripts/backup_chromadb_oci.py --source /opt/nrv-ai-agent/chroma_db --namespace ${OCI_NAMESPACE} --bucket ${OCI_BUCKET} --prefix ${OCI_PREFIX} --retention-count ${OCI_RETENTION_COUNT} --local-retention-count ${LOCAL_RETENTION_COUNT}
ExecStopPost=/usr/bin/systemctl start nrv-ai-agent.service
RuntimeMaxSec=1800

[Install]
WantedBy=multi-user.target
