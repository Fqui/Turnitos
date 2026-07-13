# Cómo crear un Vercel token para que Victoria pueda deployar

## Pasos (2 min)

1. Andá a https://vercel.com/account/tokens
2. Click en **"Create Token"**
3. **Name**: `Victoria-deploy`
4. **Scope**: Full access (o el que tengas habilitado)
5. **Expiration**: deja en 1 day o 24 hours (solo lo uso ahora)
6. Click **"Create"**
7. **Copialo** (empieza con algo tipo `vckr_...` o `vercel_...`)
8. Pegámelo en este chat

## Qué hago con él

1. Deploy manual del código actual con `vercel --prod`
2. Asigno el dominio `www.turnitoslr.com` al proyecto donde está corriendo lo nuevo
3. Verifico que `turnitoslr.com` siga funcionando

## Después

- Vos podés revocar el token cuando quieras
- O esperar a que expire (1 día)

