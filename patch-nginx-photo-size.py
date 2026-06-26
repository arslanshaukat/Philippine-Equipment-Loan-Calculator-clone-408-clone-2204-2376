with open('/etc/nginx/sites-enabled/app', 'r') as f:
    content = f.read()

old_block = """    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""

new_block = """    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }"""

if old_block not in content:
    print("ERROR: /api/ block anchor not found. No changes made.")
    raise SystemExit(1)

content = content.replace(old_block, new_block, 1)

with open('/etc/nginx/sites-enabled/app', 'w') as f:
    f.write(content)

print("SUCCESS: client_max_body_size 50M added to /api/ block.")
