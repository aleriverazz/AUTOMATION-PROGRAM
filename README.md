# Programa → Burbujas
### Manual de uso — Estudio Santander & Lunaa

Esta herramienta convierte el programa arquitectónico (espacios, áreas y sus relaciones) en un diagrama de burbujas automático, con múltiples variantes espaciales generadas a partir de la misma información. También muestra esa información como las matrices triangulares que ya usamos en oficina (Importancia Relativa, Relación Física, Deseos y Motivos).

No requiere instalación — es una página web. Se abre en cualquier navegador.

> **Estado: en desarrollo (WIP).** Esta herramienta es el **Paso 1** del workflow de programación arquitectónica de la oficina — no reemplaza todavía ningún paso posterior, solo lo agiliza. El flujo completo del proyecto tiene dos pasos:
>
> - **Paso 1 — esta herramienta:** Excel del programa → matrices → diagrama de burbujas → variantes espaciales. *(lo que describe este manual)*
> - **Paso 2 — pendiente de construir:** el JSON exportado desde la pestaña Burbujas se lleva a Grasshopper para generar la masa 3D en Rhino. Ese puente (leer el JSON dentro de Grasshopper) todavía no existe.
>
> Este documento se irá actualizando conforme la herramienta avance. Si algo de lo descrito aquí ya no coincide con lo que ves en pantalla, es porque cambió — avisar para actualizar el manual.

---

## 1. Estructura de la pantalla

```
┌───────────────┬─────────────────────────────────┐
│               │  [ Burbujas ]  [ Matrices ]      │  ← pestañas
│   CONSOLA     │                                   │
│   (izquierda) │        vista activa               │
│               │                                   │
│  · Nodos      │                                   │
│  · Relaciones │                                   │
│  · Motivos    │                                   │
│  · Simbología │                                   │
│  · GitHub     │                                   │
└───────────────┴─────────────────────────────────┘
```

La **consola de la izquierda no cambia** sin importar en qué pestaña estés. Ahí se captura toda la información del proyecto; las pestañas de la derecha solo son distintas formas de visualizarla.

---

## 2. Capturar el programa arquitectónico

### 2.1 Nodos (espacios)
Cada fila es un espacio del programa:

| Campo | Qué es |
|---|---|
| **Espacio** | Nombre del local (ej. "Despacho de Alcalde") |
| **m²** | Área asignada — define el tamaño de la burbuja |
| **Planta** | Baja o Alta — agrupa visualmente el diagrama en dos zonas |

Botón **+ agregar espacio** para sumar filas. La ✕ al final de cada fila la elimina.

### 2.2 Relaciones (matrices)
Cada fila es una relación entre dos espacios — es la misma información que hoy vive en las 3 matrices de Excel/CAD, pero capturada una sola vez:

| Campo | Qué es | Equivale a |
|---|---|---|
| **A / B** | Los dos espacios relacionados | fila/columna de la matriz |
| **Motivo** | Texto libre explicando el porqué de la relación | Deseos y Motivos |
| **Física** | Tipo de relación espacial (contención, contiguo, separación...) | Relación Física |
| **Importancia** | Qué tan obligatoria es esa relación (mandatoria, deseable, neutral, negativa, por decidir) | Importancia Relativa |

Solo se necesita **una fila por par de espacios relacionados** — esa misma fila alimenta las tres matrices y el diagrama de burbujas a la vez. No hay que capturar la información tres veces.

### 2.3 Leyenda de motivos
Lista numerada (formato "1. texto del motivo") que aparece al pie de la matriz de Deseos y Motivos, igual que en nuestras láminas. **No hace falta escribirla a mano**: cuando escribes un motivo nuevo en la tabla de Relaciones, la herramienta le asigna el siguiente número disponible y lo agrega solo a esta lista. Si quieres editar el texto de un motivo ya numerado, puedes hacerlo directo aquí.

### 2.4 Simbología aplicada
Referencia rápida de los colores y símbolos que se están usando — no es editable desde aquí, solo consulta.

---

## 3. Pestaña "Burbujas"

Genera varias configuraciones espaciales distintas a partir de la misma información, y las deja comparar lado a lado.

### 3.1 Controles

| Control | Qué hace |
|---|---|
| **N.º variantes** | Cuántas configuraciones distintas genera (2 a 8) |
| **Repulsión general** | Qué tan separadas quedan las burbujas entre sí en general — ver explicación abajo |
| **Generar variantes** | Vuelve a correr el cálculo con los valores actuales |
| **Cargar ejemplo** | Carga un programa de muestra para probar la herramienta |

**¿Qué es la repulsión general?**
Es qué tan fuerte se empujan *todas* las burbujas entre sí, sin importar si están relacionadas o no. Trabaja junto con dos fuerzas más:

- La relación específica entre dos espacios (definida por Física + Importancia) los acerca o los mantiene a distancia
- La repulsión general aleja a todas las burbujas entre sí, tengan relación o no
- La colisión evita que dos círculos se encimen

Con repulsión baja, el diagrama queda más compacto. Con repulsión alta, se expande y las burbujas sin relación directa se separan más — pero relaciones "mandatorias" pueden estirarse un poco más al competir contra ese empuje. Conviene mover el control y observar cómo cambian las variantes, no hay un valor "correcto" fijo.

### 3.2 Leer las variantes
Cada tarjeta muestra una configuración distinta con su **% de cumplimiento** — qué tan bien esa variante respeta las distancias y separaciones que definiste en la tabla de Relaciones. Click en una tarjeta la manda al panel grande de abajo para verla en detalle.

### 3.3 Exportar
- **Exportar JSON (→ GH)**: guarda la variante seleccionada en un archivo listo para leerse desde Grasshopper en la siguiente etapa (masa 3D en Rhino)
- **Exportar SVG**: guarda el dibujo de la variante seleccionada como imagen vectorial

---

## 4. Pestaña "Matrices"

Muestra las 3 matrices triangulares calculadas automáticamente a partir de la tabla de Relaciones — mismo formato que nuestras láminas AutoCAD:

- **Importancia Relativa** — rombo de color según el tipo de adyacencia
- **Relación Física** — glifo (círculo/triángulo abierto o cerrado) según el tipo de relación espacial
- **Deseos y Motivos** — número del motivo en cada celda, con la lista numerada al costado

Se actualizan solas cada vez que editas Nodos o Relaciones en la consola izquierda. No hay que dibujar nada a mano.

---

## 5. Guardar y recuperar estudios (GitHub)

Sirve para no perder el trabajo de un proyecto y poder recuperarlo después, desde cualquier computadora.

1. Llenar **usuario/organización**, **repositorio** y **token** (una sola vez — queda guardado en ese navegador)
2. **Guardar estudio**: sube el proyecto actual (nombre, nodos, relaciones, motivos, variante seleccionada) a una carpeta con el nombre del proyecto dentro del repositorio
3. **Ver estudios**: lista los proyectos ya guardados
4. **Cargar seleccionado**: trae de vuelta un proyecto guardado y recalcula todo

> El token es una llave de acceso a un repositorio de GitHub. Debe crearse como *fine-grained personal access token*, limitado a un solo repositorio, con permiso de **Contents (read & write)** únicamente. No compartir el token fuera de la oficina.

---

## 6. Flujo de trabajo recomendado

1. Capturar espacios en **Nodos**
2. Capturar relaciones en **Relaciones**, con su motivo, física e importancia
3. Revisar la pestaña **Matrices** — es el equivalente digital de la lámina de matrices, útil para validar con el equipo antes de generar burbujas
4. Ir a **Burbujas**, ajustar N.º de variantes y repulsión, generar
5. Elegir la variante con mejor cumplimiento (o la que tenga más sentido para el proyecto)
6. **Exportar JSON** para continuar hacia masa 3D en Rhino/Grasshopper
7. **Guardar estudio** en GitHub para dejar registro del proyecto

---

## 7. Pendientes conocidos (próximos pasos)

Por transparencia con quien use esta herramienta mientras sigue en desarrollo:

- [ ] **Carga de Excel real.** El botón "Cargar ejemplo" hoy solo carga un proyecto de muestra escrito en el código — no lee archivos. El siguiente paso es agregar un botón para subir el Excel del programa arquitectónico directamente (arrastrar el archivo o seleccionarlo), leyendo las 4 pestañas que ya usamos (Tabla de Áreas, Matriz DM, Matriz RF, Matriz IR) sin tener que volver a capturar nada a mano en la consola izquierda.
- [ ] **Puente a Grasshopper (Paso 2 del workflow).** Falta construir el lado de Grasshopper que lea el JSON exportado desde la pestaña Burbujas y genere la masa 3D en Rhino. Por ahora el JSON se exporta pero no hay nada del otro lado que lo reciba todavía.
- [ ] **Glifos de relación física en el diagrama de burbujas.** Actualmente las líneas del diagrama solo usan color y grosor (por Importancia); los glifos por tipo de Relación Física —ya presentes en la vista de Matrices— aún no se dibujan sobre las líneas de burbujas.

---

*Estudio Santander & Lunaa — herramienta interna de programación arquitectónica. Este manual describe el Paso 1 del workflow (WIP) y se actualizará conforme avance la herramienta.*
