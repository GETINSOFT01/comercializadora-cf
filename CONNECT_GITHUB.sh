#!/bin/bash

# Script para conectar repositorio local con GitHub
# Ejecutar después de crear el repositorio en GitHub

echo "🚀 Conectando repositorio local con GitHub..."

# Solicitar username de GitHub
read -p "Ingresa tu username de GitHub: " GITHUB_USER

# Verificar que se ingresó un username
if [ -z "$GITHUB_USER" ]; then
    echo "❌ Error: Debes ingresar tu username de GitHub"
    exit 1
fi

echo "📡 Conectando con https://github.com/$GITHUB_USER/comercializadora-cf.git"

# Agregar remote origin
git remote add origin https://github.com/$GITHUB_USER/comercializadora-cf.git

# Verificar conexión
echo "🔍 Verificando conexión..."
git remote -v

# Subir código a GitHub
echo "📤 Subiendo código a GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ ¡Repositorio conectado exitosamente!"
    echo "🌐 Tu repositorio: https://github.com/$GITHUB_USER/comercializadora-cf"
    echo ""
    echo "🔑 SIGUIENTE PASO: Configurar GitHub Secrets"
    echo "📖 Sigue la guía: SECRETS_SETUP_INTERACTIVE.md"
else
    echo "❌ Error al subir código. Verifica:"
    echo "   1. El repositorio existe en GitHub"
    echo "   2. Tienes permisos de escritura"
    echo "   3. Tu autenticación de Git está configurada"
fi
