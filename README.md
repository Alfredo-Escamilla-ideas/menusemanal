# 🍴 Menú Semanal - Planificador de Comidas

Una aplicación web minimalista para planificar tu menú semanal de forma visual y práctica. Arrastra y suelta platos para organizar las comidas y cenas de toda la semana.

![Menú Semanal](https://img.shields.io/badge/Estado-Activo-success)
![Firebase](https://img.shields.io/badge/Firebase-Opcional-orange)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## 🌟 Características

- ✅ **Planificación semanal completa** - 7 días con comida y cena (1º y 2º plato)
- 🗓️ **Vistas flexibles** - Semana completa (web) y vista diaria
- 📱 **Móvil optimizado** - Vistas Hoy y 3 Días con columnas adaptadas
- 🎨 **Diseño minimalista** - Interfaz limpia y moderna en tonos grises
- 🖱️ **Drag & Drop** - Arrastra platos desde el banco de comidas al calendario
- 📦 **Categorías colapsables** - Organiza tus platos por tipo (Primeros, Segundos, Cenas)
- ➕ **Platos personalizados** - Añade tus propios platos al banco
- 🗑️ **Gestión fácil** - Elimina platos con un click
- 💾 **Persistencia local** - Tus cambios se guardan automáticamente
- 📱 **Sincronización multi-dispositivo** (opcional con Firebase)
- 🔄 **Reinicio rápido** - Limpia todo el menú para empezar de cero (web)
- 📱 **Responsive** - Funciona en móvil, tablet y escritorio

## 🚀 Uso Rápido

### Opción 1: Usar directamente desde GitHub Pages

👉 **[Abrir la aplicación](https://daniel-escamilla.github.io/Comidas/menu.html)**

### Opción 2: Descargar y usar localmente

1. Descarga el archivo `menu.html`
2. Abre el archivo en cualquier navegador web moderno
3. ¡Empieza a planificar tu menú!

## 📖 Cómo Usar

1. **Añadir platos al menú**
   - Arrastra una comida desde el panel lateral
   - Suéltala en la casilla del día y comida deseada

2. **Añadir platos personalizados**
   - Escribe el nombre en el campo "Añadir Nuevo Plato"
   - Click en "Añadir Plato"

3. **Eliminar platos**
   - Pasa el ratón sobre un plato en el panel lateral
   - Click en la X roja para eliminarlo del banco
   - En el menú, click en la X del plato asignado

4. **Organizar categorías**
   - Click en el título de cada categoría para expandir/colapsar

5. **Reiniciar menú**
   - Click en "Reiniciar" (versión web)
   - Confirma para borrar todo el menú

6. **Cambiar vista**
   - **Web:** "1 Semana" o "1 Día"
   - **Móvil:** "Hoy" o "3 Días"

## 🌐 Sincronización Multi-Dispositivo (Opcional)

Para sincronizar tu menú entre todos tus dispositivos (móvil, tablet, PC), sigue las instrucciones en [`INSTRUCCIONES_FIREBASE.md`](INSTRUCCIONES_FIREBASE.md).

**Sin Firebase:** Los datos se guardan solo en tu navegador actual (localStorage)  
**Con Firebase:** Los cambios se sincronizan automáticamente entre todos tus dispositivos en tiempo real

## 🛠️ Tecnologías

- **HTML5** - Estructura
- **CSS3** - Estilos minimalistas
- **JavaScript Vanilla** - Lógica y funcionalidad
- **Firebase Firestore** (opcional) - Sincronización en la nube
- **Drag and Drop API** - Interacción intuitiva
- **localStorage** - Persistencia local

## 📁 Estructura del Proyecto

```
Comidas/
├── menu.html                    # Aplicación principal
├── menu.css                     # Estilos
├── menu.js                      # Lógica
├── INSTRUCCIONES_FIREBASE.md   # Guía para configurar sincronización
└── README.md                    # Este archivo
```

## 🎨 Capturas de Pantalla

### Vista Principal
- Tabla semanal con días en columnas
- Panel lateral con banco de comidas
- Diseño limpio en blanco y negro

### Panel de Comidas
- Primeros Platos 🥗
- Segundos Platos 🍗
- Cenas Ligeras 🌙
- Categorías expandibles/colapsables

## 💡 Casos de Uso

- 👨‍👩‍👧‍👦 **Familias** - Planificar comidas semanales juntos
- 🏋️ **Fitness** - Organizar dietas y planes nutricionales
- 💰 **Ahorro** - Planificar compras semanales sin desperdicio
- 🍱 **Meal Prep** - Preparar comidas con anticipación
- 🏠 **Convivencia** - Coordinar menús entre compañeros de piso

## 🔧 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- (Opcional) Cuenta de Firebase para sincronización

## 📝 Personalización

El archivo es completamente autónomo (HTML + CSS + JS en un solo archivo). Puedes modificar:

- **Platos predefinidos** - Edita las listas en el HTML
- **Colores** - Modifica las variables CSS
- **Días de la semana** - Cambia los encabezados de la tabla
- **Categorías** - Añade o elimina grupos de comidas

## 🤝 Contribuir

¿Tienes ideas para mejorar la aplicación?

1. Fork este repositorio
2. Crea una rama para tu mejora (`git checkout -b mejora/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Push a la rama (`git push origin mejora/NuevaCaracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:
- Abre un [Issue](../../issues) en GitHub
- Revisa las [Instrucciones de Firebase](INSTRUCCIONES_FIREBASE.md)

## 🎯 Roadmap

- [ ] Exportar menú a PDF
- [ ] Importar/Exportar JSON
- [ ] Temas de color (claro/oscuro)
- [ ] Generador automático de lista de compras
- [ ] Recetas asociadas a cada plato
- [ ] Calorías y valores nutricionales
- [ ] Historial de menús anteriores

---

Hecho con ❤️ para simplificar la planificación de comidas

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**
