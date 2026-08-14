<?php
// Carga variables desde un archivo .env (formato CLAVE=valor, sin dependencias externas)

function cargarEnv(string $ruta): void
{
    if (!file_exists($ruta)) return;

    $primera = true;
    foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        // Los .env guardados desde el Bloc de notas o PowerShell arrancan con
        // un BOM UTF-8. trim() no lo saca, así que la primera clave quedaba
        // ilegible ("\xEF\xBB\xBFDB_HOST") y se usaba el valor por defecto.
        if ($primera) {
            $linea = preg_replace('/^\xEF\xBB\xBF/', '', $linea);
            $primera = false;
        }

        $linea = trim($linea);
        if ($linea === '' || str_starts_with($linea, '#')) continue;
        [$clave, $valor] = array_pad(explode('=', $linea, 2), 2, '');
        $clave = trim($clave);
        $valor = trim($valor);
        if ($clave !== '' && getenv($clave) === false) {
            putenv("$clave=$valor");
            $_ENV[$clave] = $valor;
        }
    }
}
