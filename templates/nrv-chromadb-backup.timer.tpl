[Unit]
Description=Agendamento diário do backup ChromaDB NRV

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=10m
Unit=nrv-chromadb-backup.service

[Install]
WantedBy=timers.target
