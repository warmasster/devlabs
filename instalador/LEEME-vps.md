# Publicar relavops en el VPS

Igual que antes en lab.crafthosts.org. Caddy en el VPS con su certificado de Let's Encrypt, y labd detrás. Lo nuevo es que labd pide cuenta y las cuentas viven en el Worker de Cloudflare ([cuentas/](../cuentas/LEEME.md)), que ya está desplegado con Wrangler. labd habla con él por su dirección workers.dev, así que no depende de cómo esté el DNS.

## En tu PC

```
powershell -File build.ps1
```

Deja `dist/labd` con la web y los labs dentro. Sube al VPS `dist/labd`, la carpeta `instalador/` (con `instalador/secretos/nodo.env`, que es el secreto del latido) y la carpeta `imagenes/`, respetando las rutas.

## En el VPS, como root

```
bash instalador/vps.sh
```

Instala Docker y los motores, construye las imágenes, deja labd en 127.0.0.1:8080 con las cuentas y el latido, y pone Caddy delante. Si había una instalación de antes del cambio de nombre (servicio `devlabs`), la para, se queda con su estado y borra las imágenes viejas.

Para actualizar labd después, vuelve a subir `dist/labd` y lanza lo mismo, o solo `bash instalador/actualizar.sh`.

## En Cloudflare, el DNS

Un registro A de `relavops.org` a la IP del VPS. Lo más sencillo es con la nube gris (solo DNS), como estaba lab.crafthosts.org. Caddy saca el certificado solo.

Con la nube naranja también va. Entonces pon SSL/TLS en **Full (strict)**. Las rutas del Worker de cuentas ya están puestas en relavops.org y cogen esas peticiones antes de llegar al VPS.

## Comprobar

- https://relavops.org enseña la portada, sin cuenta. /curso ya pide entrar.
- Date de alta y nómbrate admin (ver [cuentas/LEEME.md](../cuentas/LEEME.md#el-primer-admin)).
- En el panel de admin, Servidores, sale el VPS con su CPU y su RAM. Si no sale, mira `journalctl -u relavops -n 50` y busca la línea del latido.

## Con 2 GB de RAM

Cada lab abierto gasta de 20 a 60 MB y labd tiene unos cuantos en caliente para que se abran al momento. Con `-max-sesiones 30` cabe justo. vps.sh mete todos los labs en `relavops-labs.slice` con la RAM menos 700 MB y los núcleos menos un cuarto (`/etc/systemd/system/relavops-labs.slice`). Si los labs piden más, el kernel mata un proceso de un lab y no a labd ni a Caddy. El resumen del panel de admin enseña cuántos labs más caben con la RAM libre de cada servidor. Si va justo, baja `-max-sesiones` en `/etc/systemd/system/relavops.service.d/vps.conf` (o en vps.sh) y reinicia con `systemctl restart relavops`.
