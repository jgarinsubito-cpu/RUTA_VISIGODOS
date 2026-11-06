# Planificador: recorrido temático y servicios

Este documento sigue la definición funcional de Destino Plus («Integración: asistente inteligente y planificador» v0.1: §3 nivel A y §4 nivel B) y el modelo operativo v0.2.

## 1. Recorrido temático a medida (`/planificar`)

El visitante elige:

- **Temas**: los de la portada, como tesoro, capital o arqueología.
- **Días**: de 1 a 4.
- **Primer día**: la fecha, si la sabe.
- **Horario**.
- **Dónde empieza**: Toledo o Guadamur.
- **Transporte**: a pie o en coche.
- **Ritmo**: tranquilo, unas 5 h de visitas al día; equilibrado, unas 7 h; o intenso, todo el horario.
- **Perfil**.
- Si quiere incluir **patrimonio no visigodo**.
- Si necesita **acceso sin escalones**.

La propuesta se actualiza mientras elige. Se compone así (`domain/thematic.ts`):

1. Entran los lugares de los temas elegidos. Si no elige ningún tema, entran todos los visigodos.
2. Los lugares se agrupan por localidad. Primero va la localidad donde empieza el visitante; después, la más cercana.
3. Dentro de cada localidad manda el **orden en el relato** (`narrativeOrder`, editable en la ficha del lugar). Por ejemplo, 1 para el Museo de los Concilios, que presenta la época, y 2 para la Vega Baja. Los lugares sin número van después, del más cercano al más lejano.
4. Los lugares se reparten por días sin pasar del ritmo elegido. Cada día lleva una hora para comer entre las 13:00 y las 15:00. Con fecha, se comprueba qué abre cada día.
5. El patrimonio no visigodo solo rellena el tiempo que sobra, donde añade menos trayecto. Nunca deja fuera un lugar visigodo.
6. Lo que no cabe se dice; no se quita sin avisar.

Al pulsar «Revisar y añadir a mi viaje», el visitante ve el antes y el después y acepta, como en cualquier cambio del viaje.

## 2. Viaje de varios días (`Mi viaje`)

- Cada parada lleva su día (`TripStop.day`) y cada día va de la hora de inicio a la de fin.
- En «Tu viaje» se cambian los días y la hora para comer.
- Una parada se pasa a otro día con su selector.
- Si se reducen los días, las paradas de los días que sobran pasan al último día.

## 3. Servicios: comer, dormir, coche y otros

Para cada día, `domain/services.ts` propone:

| Qué | Cuándo y dónde |
| --- | --- |
| **Dónde comer** | A la hora de la comida, a menos de 10 km en coche o 1,5 km a pie de donde esté el visitante. Al elegir un restaurante, la pausa se hace allí y el viaje recalcula los trayectos. |
| **Dónde dormir** | Cada noche, salvo la última, cerca de donde empieza el día siguiente. El día siguiente sale desde el alojamiento elegido. |
| **Alquiler de coche** | El primer día, si el viaje es en coche. |
| **Visitas guiadas y experiencias** | Las vinculadas a los lugares de ese día. |
| **Cerca de tus paradas** | Aparcamiento, cafeterías, oficinas de turismo y tiendas. |

Elegir un servicio o quitarlo es una propuesta que el visitante revisa. Lo elegido se guarda en este dispositivo con el viaje.

**Criterios de orden.** Son públicos, se muestran en `/servicios#como-ordenamos` y cumplen el Reglamento (UE) 2019/1150:

1. Primero, lo vinculado a un lugar de ese momento.
2. Después, lo abierto a esa hora según su horario comprobado. Lo que no tiene horario comprobado va detrás; lo cerrado no aparece.
3. Antes, lo adecuado para familias o sin escalones, si el visitante lo pidió.
4. Por último, la distancia.

Patrocinar o estar adherido no cambia el orden. Lo patrocinado se rotula «Patrocinado». El contenido patrimonial nunca se patrocina.

**Reservas.** La app no reserva ni cobra. «Reservar» abre la página de reserva de la propia empresa; si no hay, se ofrecen el teléfono, la web o el correo. Así se evita, por ahora:

- vender viajes combinados (Directiva (UE) 2015/2302), que exige ser agencia;
- intermediar pagos.

## 4. Gestión de servicios (`/admin/servicios`)

Cada servicio lleva:

- tipo y localidad;
- coordenadas;
- lugares vinculados;
- contacto;
- si admite reserva;
- precio orientativo;
- horario;
- accesibilidad;
- si es para familias;
- si está **adherido** y si es **patrocinado**;
- la **fecha en que se comprobaron sus datos** con la empresa.

Reglas de publicación (`validateCatalog`):

- Solo se publican empresas adheridas, salvo los ejemplos.
- Todo servicio necesita al menos un contacto.
- Los datos de más de 90 días o sin comprobar generan aviso, y la web avisa al visitante.
- Un ejemplo no puede ser patrocinado.

Hay que aplicar la migración `web/supabase/migrations/20261106120000_services.sql`.

## 5. Datos de ejemplo y empresas reales

El catálogo de demostración lleva **9 servicios de ejemplo**. Están rotulados «Ejemplo», se llaman «Ejemplo · …» y enlazan a example.org. Sirven para probar el planificador hasta que se adhieran las empresas piloto. Cuando lleguen las reales, se borran.

`empresas-candidatas-ruta-visigoda.xlsx` recoge 22 empresas reales encontradas en directorios públicos de restaurantes, alojamientos, alquiler de coches y visitas guiadas en Toledo y Guadamur. Es una lista para que el equipo comercial las contacte. Ninguna se publica sin adhesión.

## Pendiente

- El asistente aún no responde «¿dónde como cerca?» con estos servicios (función B de la definición). Es el siguiente paso.
- Faltan los nodos de pernocta rural fuera de Guadamur y los comercios de DestinosPass.
- Reserva y pago dentro de la app: solo tras decidir el modelo (pasarela con pagos divididos, condiciones P2B, agencia para paquetes).
