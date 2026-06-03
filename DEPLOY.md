# Deploy en producción

## Desarrollo local

```bash
# 1. Instalar dependencias
cd server && npm install
cd ../client && npm install

# 2. Copiar variables de entorno
cp .env.example .env          # en /server
cp client/.env.example client/.env

# 3. Arrancar servidor (puerto 3001)
cd server && npm run dev

# 4. Arrancar cliente (puerto 5173) — en otra terminal
cd client && npm run dev
```

Abrí http://localhost:5173

---

## Deploy en Railway (backend) + Vercel (frontend)

### Backend en Railway

1. Crear cuenta en railway.app
2. New Project → Deploy from GitHub repo
3. Seleccionar la carpeta `/server` como root
4. Agregar variables de entorno:
   - `JWT_SECRET` = string largo y aleatorio
   - `CLIENT_URL` = URL de tu frontend en Vercel (ej: https://mi-poker.vercel.app)
   - `PORT` = 3001 (Railway lo asigna automáticamente)
5. Railway expone automáticamente la URL del servidor

### Frontend en Vercel

1. Crear cuenta en vercel.com
2. Import Git Repository → seleccionar la carpeta `/client`
3. Framework Preset: Vite
4. Agregar variable de entorno:
   - `VITE_SERVER_URL` = URL de Railway (ej: https://poker-server.railway.app)
5. Deploy

---

## Deploy en un VPS (DigitalOcean, Linode, etc.)

```bash
# En el servidor:
git clone <tu-repo>
cd poker

# Instalar Node.js 18+
# Instalar PM2: npm install -g pm2

# Backend
cd server
cp .env.example .env && nano .env  # editar variables
npm install
pm2 start index.js --name poker-server

# Frontend (build estático)
cd ../client
cp .env.example .env && nano .env  # editar VITE_SERVER_URL
npm install && npm run build
# Servir /dist con Nginx o pm2 serve
```
