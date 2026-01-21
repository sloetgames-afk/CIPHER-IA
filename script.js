// --- LÓGICA DE NAVEGACIÓN ---
function showSection(sectionId, element) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });

    // 2. Mostrar la seleccionada
    const target = document.getElementById(sectionId);
    if(target) target.classList.add('active');

    // 3. Actualizar menú activo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');

    // 4. Cambiar el subtítulo del header
    let titleMap = {
        'panel-principal': 'Panel Principal',
        'comandos': 'Comandos',
        'consola': 'Consola',
        'premium': 'Premium',
        'info-bot': 'Información del Bot'
    };
    
    const subTitle = document.getElementById('page-subtitle');
    if(subTitle) subTitle.innerText = titleMap[sectionId] || 'Sección';

    // 5. (MOVIL) Cerrar menú automáticamente al hacer clic en una opción
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// --- LÓGICA DE TOGGLES Y MENÚ MÓVIL ---
document.addEventListener('DOMContentLoaded', function() {
    
    // A. Interruptores (Toggles)
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                console.log("Interruptor Encendido");
            } else {
                console.log("Interruptor Apagado");
            }
        });
    });

    // B. Menú Móvil (Sidebar)
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');

    // Función para abrir/cerrar
    window.toggleSidebar = function() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    if(openBtn) openBtn.addEventListener('click', toggleSidebar);
    if(closeBtn) closeBtn.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

});
