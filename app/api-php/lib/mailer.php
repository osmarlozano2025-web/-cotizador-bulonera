<?php

/**
 * Envío de mails vía Resend (API HTTP simple, sin librerías externas — el
 * proyecto no usa Composer). Se eligió por sobre SMTP porque Gmail bloquea
 * las contraseñas de aplicación en cuentas con Protección Avanzada, algo
 * que no se puede resolver desde el código.
 */
function enviarMail(string $para, string $asunto, string $cuerpoHtml): bool
{
    $cfg = require __DIR__ . '/../config.php';
    $mail = $cfg['mail'];

    if (!$mail['resend_api_key']) {
        error_log('Mailer: falta RESEND_API_KEY en .env, no se pudo enviar a ' . $para);
        return false;
    }

    $payload = json_encode([
        'from' => $mail['from'],
        'to' => [$para],
        'subject' => $asunto,
        'html' => $cuerpoHtml,
    ]);

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $mail['resend_api_key'],
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $respuesta = curl_exec($ch);
    $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errorCurl = curl_error($ch);
    curl_close($ch);

    if ($respuesta === false) {
        error_log("Mailer: fallo de conexión con Resend: $errorCurl");
        return false;
    }
    if ($codigo < 200 || $codigo >= 300) {
        error_log("Mailer: Resend respondió $codigo: $respuesta");
        return false;
    }
    return true;
}
