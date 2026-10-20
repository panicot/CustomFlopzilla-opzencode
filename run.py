"""Punt d'entrada: engega el servidor Uvicorn amb recàrrega.

El port es pot canviar de tres maneres (per ordre de prioritat):
  1) Argument de línia d'ordres:  python run.py --port 8080
  2) Variable d'entorn:           set PORT=8080  &&  python run.py
  3) Valor per defecte:           8000
"""
import argparse
import os

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Analitzador de Rangs de Pòquer")
    parser.add_argument("--host", default="127.0.0.1", help="Adreça d'escolta (per defecte 127.0.0.1)")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="Port del servidor (per defecte 8000 o la variable d'entorn PORT)",
    )
    parser.add_argument("--no-reload", action="store_true", help="Desactiva la recàrrega automàtica")
    args = parser.parse_args()

    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
