## Esquema

```
   ADAPTADORES ENTRADA          NÚCLEO (dominio)           ADAPTADORES SALIDA
  ┌──────────────────┐      ┌──────────────────────┐      ┌──────────────────┐
  │ REST Controller  │──┐   │                      │  ┌─▶│ JPA / PostgreSQL │
  │ Consumidor Kafka │──┼─▶│ [Puerto IN]          │  ├─▶│ Cliente HTTP API │
  │ CLI / Scheduler  │──┤   │   ▼                  │  ├─▶│ SMTP / SendGrid  │
  │ Test unitario    │──┘   │ Caso de uso ─▶[Puerto OUT]──┘ │ Mock en tests    │
  └──────────────────┘      └──────────────────────┘      └──────────────────┘
       (llaman)              (no conoce a nadie)          (implementan)
```

## Ejemplos

| Puerto (interfaz en el dominio) | Tipo | Adaptadores posibles |
|---|---|---|
| `CrearPedido` | Entrada | Controller REST, listener de Kafka, comando CLI |
| `ConsultarSaldo` | Entrada | Endpoint GraphQL, gRPC |
| `GuardarPedido` | Salida | JPA, MongoDB, ficheros, memoria (tests) |
| `NotificarCliente` | Salida | Email (SMTP), SMS (Twilio), push |
| `ProcesarPago` | Salida | Stripe, PayPal, simulador fake |
| `PublicarEvento` | Salida | Kafka, RabbitMQ, log |
| `ObtenerTipoCambio` | Salida | Cliente HTTP a una API externa, caché |

## Cómo se implementa

1. **Define el puerto en el dominio**, con el vocabulario del negocio (`NotificarCliente`, no `EnviarEmailSMTP`). Es solo una interfaz.
2. **Puerto de entrada**: lo implementa el caso de uso. El adaptador de entrada (por ejemplo, el controller) recibe la petición, la traduce a objetos de dominio y llama al puerto.
3. **Puerto de salida**: lo usa el caso de uso y lo implementa un adaptador en infraestructura (por ejemplo, la clase que usa JPA o Stripe). Ese adaptador traduce los objetos de dominio a entidades o DTOs externos.
4. **Conecta las piezas** en la configuración de Spring, inyectando el adaptador deseado en cada puerto.

La regla clave es que puedes cambiar de Stripe a PayPal escribiendo solo un adaptador nuevo, sin tocar el caso de uso.

### El orden correcto es de dentro hacia fuera:

- Primero el caso de uso y el modelo de dominio.
	- Después los puertos: qué ofrece el caso de uso (entrada) y qué necesita del exterior (salida).
	- Al final los adaptadores, que son detalles de tecnología.

No es una relación 1 a 1 con los casos de uso:

Un puerto de salida suele compartirse entre varios casos de uso. Por ejemplo, GuardarPedido lo usan CrearPedido, CancelarPedido, etc.
Un adaptador puede implementar varios puertos. Por ejemplo, un único adaptador JPA puede implementar GuardarPedido y BuscarPedido.
Un puerto de entrada puede tener varios adaptadores, como REST y Kafka llamando al mismo caso de uso.

En resumen: diseñas el negocio, defines los puertos que necesita, y los adaptadores se enchufan después.	