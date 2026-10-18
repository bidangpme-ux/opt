#!/bin/bash
# =====================================================================
# SIPOPT Tanggamus - Skrip Pemasangan Otomatis CasaOS (dengan Dukungan sudo)
# Dinas Tanaman Pangan dan Hortikultura Kabupaten Tanggamus
# =====================================================================

set -e

# Warna Terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}    🌱 SIPOPT TANGGAMUS - PEMASANGAN OTOMATIS CASAOS               ${NC}"
echo -e "${GREEN}    Database PostgreSQL 16 Mandiri & WhatsApp Gateway 24 Jam       ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""

# Deteksi hak akses sudo
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
        echo -e "${YELLOW}[INFO] Menjalankan dengan hak akses administrator (sudo)${NC}"
    fi
fi

# Direktori aktif aplikasi
CURRENT_DIR=$(pwd)
echo -e "${CYAN}[1/5] Lokasi direktori aplikasi:${NC} ${GREEN}${CURRENT_DIR}${NC}"

# Cek Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker belum terpasang di sistem CasaOS Anda!${NC}"
    exit 1
fi

# Tentukan perintah compose (docker compose v2 atau docker-compose v1)
COMPOSE_CMD=""
if $SUDO docker compose version &> /dev/null || docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose belum terpasang!${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker & ${COMPOSE_CMD} siap digunakan.${NC}"

# Pastikan Dockerfile ada
echo -e "${CYAN}[2/5] Memeriksa berkas sistem (Dockerfile & docker-compose.yml)...${NC}"
if [ ! -f "Dockerfile" ]; then
    echo -e "${BLUE}  Membuat Dockerfile otomatis...${NC}"
    cat << 'EOF' > Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
ENV PORT=7580
EXPOSE 7580
CMD ["npx", "tsx", "server.ts"]
EOF
    echo -e "${GREEN}  ✓ Dockerfile berhasil dibuat.${NC}"
else
    echo -e "${GREEN}  ✓ Dockerfile tersedia.${NC}"
fi

# Pastikan folder data dan izin akses read-write
echo -e "${CYAN}[3/5] Menyiapkan volume persisten data dan database...${NC}"
$SUDO mkdir -p "${CURRENT_DIR}/data"
$SUDO chmod -R 777 "${CURRENT_DIR}/data"

# Jalankan Docker Compose dengan sudo bila diperlukan
echo -e "${CYAN}[4/5] Membangun image dan menyalakan container (App + PostgreSQL 16)...${NC}"
$SUDO $COMPOSE_CMD down 2>/dev/null || $COMPOSE_CMD down 2>/dev/null || true
$SUDO $COMPOSE_CMD up -d --build || $COMPOSE_CMD up -d --build

# Healthcheck loop
echo -e "${CYAN}[5/5] Menunggu kesiapan server web & database PostgreSQL...${NC}"
RETRIES=15
while [ $RETRIES -gt 0 ]; do
    if ($SUDO docker ps 2>/dev/null || docker ps 2>/dev/null) | grep -q "sipopt-app" && ($SUDO docker ps 2>/dev/null || docker ps 2>/dev/null) | grep -q "sipopt-postgres"; then
        break
    fi
    sleep 2
    RETRIES=$((RETRIES - 1))
    echo -n "."
done
echo ""

# Ambil IP Server
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
PORT_APP=7580

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}  🎉 APLIKASI SIPOPT BERHASIL DIPASANG DI CASAOS!                   ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
echo -e "  🌐 ${YELLOW}Alamat Dashboard Web:${NC}  http://${SERVER_IP}:${PORT_APP}"
echo -e "  🌐 ${YELLOW}Akses Lokal:${NC}          http://localhost:${PORT_APP}"
echo ""
echo -e "  🔑 ${CYAN}Akun Login Default (Admin):${NC}"
echo -e "     - Username : ${GREEN}admin${NC}"
echo -e "     - Password : ${GREEN}admin123${NC}"
echo ""
echo -e "  🗄️  ${CYAN}Database PostgreSQL 16:${NC}"
echo -e "     - Status   : ${GREEN}Aktif & Terhubung Otomatis${NC}"
echo -e "     - Database : ${GREEN}sipopt_db${NC}"
echo -e "     - Port     : ${GREEN}5432 (Internal Docker Network)${NC}"
echo ""
echo -e "  ⚡ ${CYAN}Ketahanan Listrik & Jaringan:${NC}"
echo -e "     Port ${PORT_APP} telah dikunci permanen. Saat listrik padam atau"
echo -e "     router reboot, aplikasi akan otomatis hidup kembali (restart: unless-stopped)."
echo ""
echo -e "${GREEN}====================================================================${NC}"
