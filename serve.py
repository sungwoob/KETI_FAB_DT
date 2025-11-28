from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def main(port: int = 8000) -> None:
    root = Path(__file__).parent.resolve()
    handler_class = partial(SimpleHTTPRequestHandler, directory=root)
    server = HTTPServer(("0.0.0.0", port), handler_class)

    print(f"Serving {root} at http://localhost:{port}/public/index.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
