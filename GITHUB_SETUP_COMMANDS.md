# Comandos para Conectar GitHub

## Después de crear el repositorio en GitHub, ejecuta estos comandos:

```bash
# Conectar repositorio remoto (reemplaza TU_USUARIO con tu username de GitHub)
git remote add origin https://github.com/TU_USUARIO/comercializadora-cf.git

# Verificar conexión
git remote -v

# Subir código a GitHub
git push -u origin main
```

## Si ya tienes un repositorio existente:
```bash
# Verificar remotes actuales
git remote -v

# Si ya existe origin, actualizarlo
git remote set-url origin https://github.com/TU_USUARIO/comercializadora-cf.git

# Subir código
git push -u origin main
```

## Verificación:
- [ ] Repositorio creado en GitHub
- [ ] Código subido correctamente
- [ ] Branch main visible en GitHub
- [ ] Archivos del proyecto visibles

## Siguiente paso:
Una vez subido el código, configurar GitHub Secrets siguiendo `docs/GITHUB_SECRETS_SETUP.md`
