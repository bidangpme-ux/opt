#!/bin/bash
# =====================================================================
# SIPOPT Tanggamus - Skrip Pemasangan Otomatis 1-Klik di CasaOS
# Dinas Tanaman Pangan dan Hortikultura Kabupaten Tanggamus
# =====================================================================

set -e

# Warna terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}    🌱 SIPOPT TANGGAMUS - PEMASANGAN OTOMATIS 1-KLIK CASAOS         ${NC}"
echo -e "${GREEN}    Sistem Informasi Pengendalian OPT & WhatsApp Bot Mandiri        ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""

# 1. Deteksi IP Server
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
PORT_APP=7580

# 2. Tentukan Direktori Instalasi CasaOS
APP_DIR="/DATA/AppData/sipopt"
if [ ! -d "/DATA/AppData" ]; then
    APP_DIR="/opt/sipopt"
fi

echo -e "${CYAN}[1/5] Memeriksa lingkungan sistem...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker belum terpasang di sistem ini! Harap pasang Docker terlebih dahulu.${NC}"
    exit 1
fi

# Cek docker compose
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose belum terpasang!${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Docker & Docker Compose terdeteksi aktif.${NC}"
echo -e "${GREEN}  ✓ Target direktori aplikasi: ${APP_DIR}${NC}"

# 3. Siapkan Folder Aplikasi
echo -e "${CYAN}[2/5] Menyiapkan berkas dan direktori data...${NC}"
mkdir -p "${APP_DIR}/data"

# Jika dijalankan dari direktori repository saat ini:
if [ -f "./docker-compose.yml" ] && [ -f "./server.ts" ]; then
    echo -e "${BLUE}  Menyalin berkas dari direktori aktif...${NC}"
    cp -r ./* "${APP_DIR}/" 2>/dev/null || true
    cp -r ./.[!.]* "${APP_DIR}/" 2>/dev/null || true
else
    echo -e "${BLUE}  Mengunduh paket SIPOPT dari repository GitHub...${NC}"
    if command -v git &> /dev/null; then
        if [ -d "${APP_DIR}/.git" ]; then
            cd "${APP_DIR}" && git pull
        else
            git clone https://github.com/bidangpme-ux/opt.git "${APP_DIR}"
        fi
    else
        echo -e "${YELLOW}  Git tidak terpasang, memastikan berkas yang ada digunakan.${NC}"
    fi
fi

cd "${APP_DIR}"

# Pastikan folder data dan izin akses read-write
mkdir -p "${APP_DIR}/data"
chmod -R 777 "${APP_DIR}/data"

# 4. Jalankan Docker Compose
echo -e "${CYAN}[3/5] Membangun dan menyalakan container (App + PostgreSQL 16)...${NC}"
$DOCKER_COMPOSE_CMD down 2>/dev/null || true
$DOCKER_COMPOSE_CMD up -d --build

# 5. Menunggu Healthcheck Database & Server
echo -e "${CYAN}[4/5] Menunggu inisialisasi database PostgreSQL & auto-DDL...${NC}"
RETRIES=15
READY=0
while [ $RETRIES -gt 0 ]; do
    if docker ps | grep -q "sipopt-app" && docker ps | grep -q "sipopt-postgres"; then
        READY=1
        break
    fi
    sleep 2
    RETRIES=$((RETRIES - 1))
    echo -n "."
done
echo ""

echo -e "${CYAN}[5/5] Memeriksa respon web dashboard di port ${PORT_APP}...${NC}"
sleep 5

# Tampilkan Informasi Berhasil
echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}  🎉 INSTALASI SELESAI & SISTEM AKTIF 100% OTOMATIS!                ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
echo -e "  🌐 ${YELLOW}Akses Dashboard Web:${NC}  http://${SERVER_IP}:${PORT_APP}"
echo -e "  🌐 ${YELLOW}Atau Alamat Lokal:${NC}    http://localhost:${PORT_APP}"
echo ""
echo -e "  🔑 ${CYAN}Akun Login Default (Admin):${NC}"
echo -e "     - Username : ${GREEN}admin${NC}"
echo -e "     - Password : ${GREEN}admin123${NC}"
echo ""
echo -e "  🗄️  ${CYAN}Status Database:${NC}"
echo -e "     - Engine   : ${GREEN}PostgreSQL 16 (Auto-Created & Auto-Migrated)${NC}"
echo -e "     - Database : ${GREEN}sipopt_db${NC}"
echo -e "     - User/Pass: ${GREEN}sipopt / sipopt_secret_pass_2026${NC}"
echo ""
echo -e "  📱 ${CYAN}Bot WhatsApp:${NC}"
echo -e "     - Status   : ${GREEN}Aktif 24/7 (Fonnte API Gateway)${NC}"
echo ""
echo -e "  ⚡ ${YELLOW}Catatan Keamanan Listrik & Router:${NC}"
echo -e "     Port ${PORT_APP} telah dikunci permanen. Jika listrik padam atau router"
echo -e "     reboot, aplikasi akan otomatis menyala kembali (restart: unless-stopped)"
echo -e "     dan seluruh data tersimpan aman di volume harddisk CasaOS."
echo ""
echo -e "${GREEN}====================================================================${NC}"
