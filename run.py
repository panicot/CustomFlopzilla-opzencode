"""Entry point: starts the Uvicorn server with auto-reload.

The port can be changed in three ways (in order of precedence):
  1) Command-line argument:  python run.py --port 8080
  2) Environment variable:   set PORT=8080  &&  python run.py
  3) Default value:          8000
"""
import argparse
import os

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Poker Range Analyzer")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default 127.0.0.1)")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="Server port (default 8000 or the PORT environment variable)",
    )
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    args = parser.parse_args()

    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
