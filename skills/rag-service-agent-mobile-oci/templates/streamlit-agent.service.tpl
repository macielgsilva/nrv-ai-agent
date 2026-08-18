[Unit]
Description={{SERVICE_DESCRIPTION}}
After=network.target

[Service]
Type=simple
User={{RUN_AS_USER}}
WorkingDirectory={{PROJECT_DIRECTORY}}
EnvironmentFile={{PROJECT_DIRECTORY}}/.env
ExecStart={{PROJECT_DIRECTORY}}/.venv/bin/streamlit run {{APP_FILE}} --server.address 127.0.0.1 --server.port 8501 --server.headless true
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
