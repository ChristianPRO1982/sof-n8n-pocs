![uv](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json&style=for-the-badge)
![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/docker--compose-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## .env
```
export API_AUTH_USERNAME="admin"
export API_AUTH_PASSWORD_HASH="$xxxxxxxxxxxyyyyyyyyyyyyyyy"
export API_JWT_SECRET="xxxxx-yyyyy-zzzzz-00000-11111"
export API_JWT_ALGORITHM="HS256"
export API_JWT_EXPIRE_MINUTES="1440"
```

## command examples

```bash
docker build -t xxx/yyy:latest . && docker push xxx/yyy:latest
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
docker compose down && docker compose up -d --remove-orphans
```

```bash
docker compose down && docker compose up -d --remove-orphans
```

```bash
docker network create networkname
```

```bash
docker rmi xxxxx
docker image prune
docker system prune
```
