from google.cloud import firestore

_client = None

def get_firestore_client() -> firestore.AsyncClient:
    global _client
    if _client is None:
        _client = firestore.AsyncClient()
    return _client
