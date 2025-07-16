/* ─────────────── variables de estado ─────────────── */
let celdaSeleccionada = null;
let turno = 'blanco';
const estadoEnroque = {
    blanco: { rey:true, torreLarga:true, torreCorta:true },
    negro: { rey:true, torreLarga:true, torreCorta:true }
}

const celdas = document.querySelectorAll('.tab-colum');
const indicador = document.getElementById('turno-indicador');
const avisoJaque = document.getElementById('mensaje-jaque');


/* ─────────────── utilidades de color / posición ─────────────── */
function esPiezaBlanca(p) { 
    return p && p.charCodeAt(0) >= 9812 && p.charCodeAt(0) <= 9817; 
}
function esPiezaNegra(p) { 
    return p && p.charCodeAt(0) >= 9818 && p.charCodeAt(0) <= 9823; 
}
function obtenerPosicion(celda) {
    const fila = celda.parentElement;
    return [
        Array.from(fila.parentElement.children).indexOf(fila),
        Array.from(fila.children).indexOf(celda)
    ];
}


/* ─────────────── identificadores de piezas ─────────────── */
function esPeon(pieza) {
    return pieza === '♙' || pieza === '♟';
}
function esCaballo(pieza) {
    return pieza === '♘' || pieza === '♞';
}
function esAlfil(pieza) {
    return pieza === '♗' || pieza === '♝';
}
function esTorre(pieza) {
    return pieza === '♖' || pieza === '♜';
}
function esReina(pieza) {
    return pieza === '♕' || pieza === '♛';
}   
function esRey(pieza) {
    return pieza === '♔' || pieza === '♚';
}
/* ─────────────── validadores de movimiento ─────────────── */
function hayPiezaEnCamino(desde, hasta) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    
    const deltaF = fHasta - fDesde;
    const deltaC = cHasta - cDesde;
    
    const pasoF = deltaF === 0 ? 0 : deltaF / Math.abs(deltaF);
    const pasoC = deltaC === 0 ? 0 : deltaC / Math.abs(deltaC);
    
    let f = fDesde + pasoF;
    let c = cDesde + pasoC;
    
    const filas = document.querySelectorAll('.tab-fila');
    
    while (f !== fHasta || c !== cHasta) {
        if (f < 0 || f >= 8 || c < 0 || c >= 8) break;
        if (filas[f].children[c].innerHTML !== '') return true;
        f += pasoF;
        c += pasoC;
    }
    
    return false;
}

function esMovimientoValidoPeon(desde, hasta, pieza, destino) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    
    const esBlanco = esPiezaBlanca(pieza);
    const direccion = esBlanco ? -1 : 1; // blancas suben, negras bajan
    const filaInicial = esBlanco ? 6 : 1;
    
    const deltaF = fHasta - fDesde;
    const deltaC = Math.abs(cHasta - cDesde);
    
    // Movimiento hacia adelante
    if (deltaC === 0) {
        if (destino !== '') return false; // no puede capturar hacia adelante
        if (deltaF === direccion) return true; // un paso
        if (fDesde === filaInicial && deltaF === 2 * direccion) return true; // dos pasos desde posición inicial
    }
    
    // Captura diagonal
    if (deltaC === 1 && deltaF === direccion) {
        return destino !== '' && destino !== 'rey'; // debe haber pieza para capturar
    }
    
    return false;
}

function esMovimientoValidoCaballo(desde, hasta) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    
    const deltaF = Math.abs(fHasta - fDesde);
    const deltaC = Math.abs(cHasta - cDesde);
    
    return (deltaF === 2 && deltaC === 1) || (deltaF === 1 && deltaC === 2);
}

function esMovimientoValidoAlfil(desde, hasta) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    
    const deltaF = Math.abs(fHasta - fDesde);
    const deltaC = Math.abs(cHasta - cDesde);
    
    if (deltaF !== deltaC) return false; // debe ser diagonal
    
    return !hayPiezaEnCamino(desde, hasta);
}

function esMovimientoValidoTorre(desde, hasta) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    
    if (fDesde !== fHasta && cDesde !== cHasta) return false; // debe ser horizontal o vertical
    
    return !hayPiezaEnCamino(desde, hasta);
}

function esMovimientoValidoReina(desde, hasta) {
    return esMovimientoValidoTorre(desde, hasta) || esMovimientoValidoAlfil(desde, hasta);
}

function esMovimientoValidoRey(desde, hasta, pieza) {
    const [fDesde, cDesde] = desde;
    const [fHasta, cHasta] = hasta;
    const deltaF = Math.abs(fHasta - fDesde);
    const deltaC = Math.abs(cHasta - cDesde);
    
    // Movimiento normal (1 casilla)
    if (deltaF <= 1 && deltaC <= 1) {
        return true;
    }
    
    // Verificar enroque
    const color = esPiezaBlanca(pieza) ? 'blanco' : 'negro';
    
    // Enroque corto (O-O)
    if (deltaF === 0 && deltaC === 2 && cHasta > cDesde) {
        return puedeEnrocar(color, 'corto') && 
               !estaEnJaque(color) &&
               casillasSegurasParaEnroque(color, desde, hasta);
    }
    
    // Enroque largo (O-O-O)
    if (deltaF === 0 && deltaC === 2 && cHasta < cDesde) {
        return puedeEnrocar(color, 'largo') && 
               !estaEnJaque(color) &&
               casillasSegurasParaEnroque(color, desde, hasta);
    }
    
    return false;
}

/* ─────────────── gestión de resaltados ─────────────── */
function clearHighlights() {
    document.querySelectorAll('.movible').forEach(c => c.classList.remove('movible'));
}

/* simula mover una pieza y comprueba si deja a tu propio rey en jaque */
function dejariaEnJaque(origen, destino, turnoActual) {
    const pieza = origen.innerHTML;
    const temp = destino.innerHTML;

    destino.innerHTML = pieza;
    origen.innerHTML = '';

    const jaque = estaEnJaque(turnoActual);

    origen.innerHTML = pieza;
    destino.innerHTML = temp;

    return jaque;
}

/* marca en verde los destinos legales de la pieza seleccionada */
function marcarMovimientosValidos(origen, turnoActual) {
    clearHighlights();

    const pieza = origen.innerHTML;
    const [fDesde, cDesde] = obtenerPosicion(origen);
    const filas = document.querySelectorAll('.tab-fila');

    filas.forEach((fila, f) => {
        Array.from(fila.children).forEach((destCelda, c) => {
            if (destCelda === origen) return; // misma casilla

            const destino = destCelda.innerHTML;
            if ((turnoActual === 'blanco' && esPiezaBlanca(destino)) ||
                (turnoActual === 'negro' && esPiezaNegra(destino))) return;

            /* usar validadores */
            let ok = false;
            if (esPeon(pieza)) ok = esMovimientoValidoPeon([fDesde, cDesde], [f, c], pieza, destino);
            else if (esCaballo(pieza)) ok = esMovimientoValidoCaballo([fDesde, cDesde], [f, c]);
            else if (esAlfil(pieza)) ok = esMovimientoValidoAlfil([fDesde, cDesde], [f, c]);
            else if (esTorre(pieza)) ok = esMovimientoValidoTorre([fDesde, cDesde], [f, c]);
            else if (esReina(pieza)) ok = esMovimientoValidoReina([fDesde, cDesde], [f, c]);
            else if (esRey(pieza)) ok = esMovimientoValidoRey([fDesde, cDesde], [f, c]);

            if (!ok) return;
            if (dejariaEnJaque(origen, destCelda, turnoActual)) return;

            destCelda.classList.add('movible');
        });
    });
}

/* ─────────────── detección de jaque ─────────────── */
function estaEnJaque(turnoActual) {
    const filas = document.querySelectorAll('.tab-fila');
    let reyPos = null, reyCelda = null;

    document.querySelectorAll('.rey-jaque').forEach(e => e.classList.remove('rey-jaque'));

    filas.forEach((fila, i) => {
        Array.from(fila.children).forEach((c, j) => {
            const p = c.innerHTML;
            if ((turnoActual === 'blanco' && p === '♔') || (turnoActual === 'negro' && p === '♚')) {
                reyPos = [i, j];
                reyCelda = c;
            }
        });
    });
    
    if (!reyPos) return false;

    for (let i = 0; i < 8; i++) {
        const fila = filas[i];
        for (let j = 0; j < 8; j++) {
            const celda = fila.children[j];
            const p = celda.innerHTML;
            const enemigo = turnoActual === 'blanco' ? esPiezaNegra(p) : esPiezaBlanca(p);
            if (!enemigo) continue;

            const desde = [i, j], hasta = reyPos;
            let amenaza = false;
            if (esPeon(p)) amenaza = esMovimientoValidoPeon(desde, hasta, p, 'rey');
            else if (esCaballo(p)) amenaza = esMovimientoValidoCaballo(desde, hasta);
            else if (esAlfil(p)) amenaza = esMovimientoValidoAlfil(desde, hasta);
            else if (esTorre(p)) amenaza = esMovimientoValidoTorre(desde, hasta);
            else if (esReina(p)) amenaza = esMovimientoValidoReina(desde, hasta);
            else if (esRey(p)) amenaza = esMovimientoValidoRey(desde, hasta);

            if (amenaza) {
                reyCelda.classList.add('rey-jaque');
                avisoJaque.textContent = `¡El rey ${turnoActual} está en JAQUE!`;
                avisoJaque.style.display = 'block';
                return true;
            }
        }
    }
    
    avisoJaque.style.display = 'none';
    return false;
}

/*────────────────────verificador de enroque────────────────────*/
function puedeEnrocar(color, tipo) {
    // Verificar que el rey y la torre correspondiente no se hayan movido
    if (color === 'blanco') {
        if (tipo === 'corto') return estadoEnroque.blanco.rey && estadoEnroque.blanco.torreCorta;
        if (tipo === 'largo') return estadoEnroque.blanco.rey && estadoEnroque.blanco.torreLarga;
    } else {
        if (tipo === 'corto') return estadoEnroque.negro.rey && estadoEnroque.negro.torreCorta;
        if (tipo === 'largo') return estadoEnroque.negro.rey && estadoEnroque.negro.torreLarga;
    }
    return false;
}

/*────────────────────verificador de casillas de enroque────────────────────*/
function casillasSegurasParaEnroque(color, desdeRey, hastaRey) {
    const [fila, colInicio] = desdeRey;
    const [_, colFin] = hastaRey;
    const paso = colFin > colInicio ? 1 : -1;
    
    // Verificar que ninguna casilla intermedia esté bajo ataque
    for (let c = colInicio; c !== colFin; c += paso) {
        if (estaCasillaBajoAtaque([fila, c], color === 'blanco' ? 'negro' : 'blanco')) {
            return false;
        }
    }
    return true;
}

/*────────────────────movimiento de enroque────────────────────*/
function realizarEnroque(color, tipo) {
    const fila = color === 'blanco' ? 7 : 0;
    const filas = document.querySelectorAll('.tab-fila');
    
    if (tipo === 'corto') {
        // Mover rey
        filas[fila].children[4].innerHTML = '';
        filas[fila].children[6].innerHTML = color === 'blanco' ? '♔' : '♚';
        
        // Mover torre
        filas[fila].children[7].innerHTML = '';
        filas[fila].children[5].innerHTML = color === 'blanco' ? '♖' : '♜';
    } else {
        // Mover rey
        filas[fila].children[4].innerHTML = '';
        filas[fila].children[2].innerHTML = color === 'blanco' ? '♔' : '♚';
        
        // Mover torre
        filas[fila].children[0].innerHTML = '';
        filas[fila].children[3].innerHTML = color === 'blanco' ? '♖' : '♜';
    }
    
    // Actualizar estado del enroque
    estadoEnroque[color].rey = false;
    estadoEnroque[color].torreCorta = false;
    estadoEnroque[color].torreLarga = false;
}



/* ─────────────── detección de jaque mate y tablas ─────────────── */
function tieneMovimientosLegales(turnoActual) {
    const filas = document.querySelectorAll('.tab-fila');
    
    // Revisar todas las piezas del jugador actual
    for (let i = 0; i < 8; i++) {
        const fila = filas[i];
        for (let j = 0; j < 8; j++) {
            const celda = fila.children[j];
            const pieza = celda.innerHTML;
            
            // Verificar si es una pieza del turno actual
            const esPiezaPropia = (turnoActual === 'blanco' && esPiezaBlanca(pieza)) || 
                                  (turnoActual === 'negro' && esPiezaNegra(pieza));
            
            if (!esPiezaPropia) continue;
            
            // Probar todos los movimientos posibles para esta pieza
            for (let f = 0; f < 8; f++) {
                for (let c = 0; c < 8; c++) {
                    const destCelda = filas[f].children[c];
                    const destino = destCelda.innerHTML;
                    
                    // No mover a la misma casilla
                    if (f === i && c === j) continue;
                    
                    // No capturar piezas propias
                    if ((turnoActual === 'blanco' && esPiezaBlanca(destino)) ||
                        (turnoActual === 'negro' && esPiezaNegra(destino))) continue;
                    
                    // No capturar el rey
                    if (destino === '♔' || destino === '♚') continue;
                    
                    // Verificar si el movimiento es válido según las reglas de la pieza
                    let movimientoValido = false;
                    const desde = [i, j];
                    const hasta = [f, c];
                    
                    if (esPeon(pieza)) movimientoValido = esMovimientoValidoPeon(desde, hasta, pieza, destino);
                    else if (esCaballo(pieza)) movimientoValido = esMovimientoValidoCaballo(desde, hasta);
                    else if (esAlfil(pieza)) movimientoValido = esMovimientoValidoAlfil(desde, hasta);
                    else if (esTorre(pieza)) movimientoValido = esMovimientoValidoTorre(desde, hasta);
                    else if (esReina(pieza)) movimientoValido = esMovimientoValidoReina(desde, hasta);
                    else if (esRey(pieza)) movimientoValido = esMovimientoValidoRey(desde, hasta);
                    
                    if (!movimientoValido) continue;
                    
                    // Verificar si el movimiento no deja al rey en jaque
                    if (!dejariaEnJaque(celda, destCelda, turnoActual)) {
                        return true; // Encontramos al menos un movimiento legal
                    }
                }
            }
        }
    }
    
    return false; // No hay movimientos legales
}

function verificarFinDeJuego(turnoActual) {
    const enJaque = estaEnJaque(turnoActual);
    const tieneMovimientos = tieneMovimientosLegales(turnoActual);
    
    if (!tieneMovimientos) {
        if (enJaque) {
            // Jaque mate
            const ganador = turnoActual === 'blanco' ? 'negro' : 'blanco';
            avisoJaque.textContent = `¡JAQUE MATE! Ganan las ${ganador === 'blanco' ? 'blancas' : 'negras'}`;
            avisoJaque.style.display = 'block';
            avisoJaque.style.backgroundColor = '#ff4444';
            avisoJaque.style.color = 'white';
            avisoJaque.style.fontWeight = 'bold';
            
            // Deshabilitar el tablero
            deshabilitarTablero();
            return 'jaque_mate';
        } else {
            // Ahogado (tablas)
            avisoJaque.textContent = `¡TABLAS por AHOGADO! El jugador ${turnoActual} no tiene movimientos legales pero no está en jaque`;
            avisoJaque.style.display = 'block';
            avisoJaque.style.backgroundColor = '#ffa500';
            avisoJaque.style.color = 'white';
            avisoJaque.style.fontWeight = 'bold';
            
            // Deshabilitar el tablero
            deshabilitarTablero();
            return 'ahogado';
        }
    }
    
    return null; // El juego continúa
}

function deshabilitarTablero() {
    // Remover todos los event listeners de las celdas
    celdas.forEach(celda => {
        celda.style.pointerEvents = 'none';
    });
    
    // Limpiar selección y resaltados
    clearHighlights();
    if (celdaSeleccionada) {
        celdaSeleccionada.classList.remove('seleccionada');
        celdaSeleccionada = null;
    }
    
    // Agregar botón de reinicio
    if (!document.getElementById('boton-reinicio')) {
        const botonReinicio = document.createElement('button');
        botonReinicio.id = 'boton-reinicio';
        botonReinicio.textContent = 'Nueva Partida';
        botonReinicio.style.marginTop = '10px';
        botonReinicio.style.padding = '10px 20px';
        botonReinicio.style.fontSize = '16px';
        botonReinicio.style.backgroundColor = 'black';
        botonReinicio.style.color = 'white';
        botonReinicio.style.border = 'none';
        botonReinicio.style.borderRadius = '5px';
        botonReinicio.style.cursor = 'pointer';
        
        botonReinicio.addEventListener('click', reiniciarJuego);
        
        // Insertar el botón después del mensaje de jaque
        avisoJaque.parentNode.insertBefore(botonReinicio, avisoJaque.nextSibling);
    }
}

function reiniciarJuego() {
    // Restaurar el tablero a posición inicial
    const posicionInicial = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
    
    const filas = document.querySelectorAll('.tab-fila');
    filas.forEach((fila, i) => {
        Array.from(fila.children).forEach((celda, j) => {
            celda.innerHTML = posicionInicial[i][j];
        });
    });
    
    // Restaurar variables de estado
    turno = 'blanco';
    celdaSeleccionada = null;
    indicador.textContent = 'Turno: Blanco';
    
    // Restaurar funcionalidad del tablero
    celdas.forEach(celda => {
        celda.style.pointerEvents = 'auto';
    });
    
    // Limpiar mensajes y estilos
    avisoJaque.style.display = 'none';
    avisoJaque.style.backgroundColor = '';
    avisoJaque.style.color = '';
    avisoJaque.style.fontWeight = '';
    
    clearHighlights();
    document.querySelectorAll('.rey-jaque').forEach(e => e.classList.remove('rey-jaque'));
    
    // Remover botón de reinicio
    const botonReinicio = document.getElementById('boton-reinicio');
    if (botonReinicio) {
        botonReinicio.remove();
    }
}

/* ─────────────── promoción de peones ─────────────── */
function mostrarMenuPromocion(celda, esBlanco, callback) {
    // Crear overlay para el menú
    const overlay = document.createElement('div');
    overlay.id = 'promocion-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';

    // Crear menú de selección
    const menu = document.createElement('div');
    menu.style.backgroundColor = 'white';
    menu.style.padding = '20px';
    menu.style.borderRadius = '10px';
    menu.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    menu.style.textAlign = 'center';

    const titulo = document.createElement('h3');
    titulo.textContent = 'que onda tu peon pai';
    titulo.style.marginTop = '0';
    titulo.style.marginBottom = '15px';
    titulo.style.color = '#333';
    menu.appendChild(titulo);

    const subtitulo = document.createElement('p');
    subtitulo.textContent = 'elige en qué pieza convertir tu peón:';
    subtitulo.style.marginBottom = '20px';
    subtitulo.style.color = '#666';
    menu.appendChild(subtitulo);

    // Crear botones para cada pieza
    const piezas = [
        { nombre: 'Reina', simbolo: esBlanco ? '♕' : '♛', valor: 'reina' },
        { nombre: 'Torre', simbolo: esBlanco ? '♖' : '♜', valor: 'torre' },
        { nombre: 'Alfil', simbolo: esBlanco ? '♗' : '♝', valor: 'alfil' },
        { nombre: 'Caballo', simbolo: esBlanco ? '♘' : '♞', valor: 'caballo' }
    ];

    const contenedorBotones = document.createElement('div');
    contenedorBotones.style.display = 'flex';
    contenedorBotones.style.gap = '10px';
    contenedorBotones.style.justifyContent = 'center';

    piezas.forEach(pieza => {
        const boton = document.createElement('button');
        boton.innerHTML = `${pieza.simbolo}<br><small>${pieza.nombre}</small>`;
        boton.style.padding = '15px';
        boton.style.fontSize = '24px';
        boton.style.border = '2px solid #ddd';
        boton.style.borderRadius = '8px';
        boton.style.backgroundColor = '#f9f9f9';
        boton.style.cursor = 'pointer';
        boton.style.transition = 'all 0.2s';
        boton.style.minWidth = '80px';

        boton.addEventListener('mouseenter', () => {
            boton.style.backgroundColor = '#e3f2fd';
            boton.style.borderColor = '#2196F3';
            boton.style.transform = 'scale(1.05)';
        });

        boton.addEventListener('mouseleave', () => {
            boton.style.backgroundColor = '#f9f9f9';
            boton.style.borderColor = '#ddd';
            boton.style.transform = 'scale(1)';
        });

        boton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            callback(pieza.simbolo);
        });

        contenedorBotones.appendChild(boton);
    });

    menu.appendChild(contenedorBotones);
    overlay.appendChild(menu);
    document.body.appendChild(overlay);
}

function necesitaPromocion(pieza, filaDestino, esBlanco) {
    if (!esPeon(pieza)) return false;
    
    // Peones blancos llegan a la fila 0, peones negros a la fila 7
    if (esBlanco && filaDestino === 0) return true;
    if (!esBlanco && filaDestino === 7) return true;
    
    return false;
}

function ejecutarPromocion(origen, destino, piezaElegida, callback) {
    // Ejecutar el movimiento con la pieza promocionada
    destino.innerHTML = piezaElegida;
    origen.innerHTML = '';
    
    // Continuar con el flujo normal del juego
    callback();
}
celdas.forEach(celda => {
    celda.addEventListener('click', () => {
        const contenido = celda.innerHTML;

        /* seleccionar pieza propia */
        if (!celdaSeleccionada && contenido !== '') {
            if ((turno === 'blanco' && esPiezaBlanca(contenido)) || 
                (turno === 'negro' && esPiezaNegra(contenido))) {
                celdaSeleccionada = celda;
                celda.classList.add('seleccionada');
                marcarMovimientosValidos(celdaSeleccionada, turno);
            }
            return;
        }

        /* des-seleccionar */
        if (celda === celdaSeleccionada) {
            celda.classList.remove('seleccionada');
            celdaSeleccionada = null;
            clearHighlights();
            return;
        }

        /* intentar mover */
        if (celdaSeleccionada) {
            const pieza = celdaSeleccionada.innerHTML;
            const destino = celda.innerHTML;
            const desde = obtenerPosicion(celdaSeleccionada);
            const hasta = obtenerPosicion(celda);

            if (destino === '♔' || destino === '♚') return; // no capturar rey

            let ok = false;
            if (esPeon(pieza)) ok = esMovimientoValidoPeon(desde, hasta, pieza, destino);
            else if (esCaballo(pieza)) ok = esMovimientoValidoCaballo(desde, hasta);
            else if (esAlfil(pieza)) ok = esMovimientoValidoAlfil(desde, hasta);
            else if (esTorre(pieza)) ok = esMovimientoValidoTorre(desde, hasta);
            else if (esReina(pieza)) ok = esMovimientoValidoReina(desde, hasta);
            else if (esRey(pieza)) ok = esMovimientoValidoRey(desde, hasta);

            if (!ok) return;
            if ((turno === 'blanco' && esPiezaBlanca(destino)) || 
                (turno === 'negro' && esPiezaNegra(destino))) return;
            if (dejariaEnJaque(celdaSeleccionada, celda, turno)) return;

            /* función para completar el movimiento */
            const completarMovimiento = (piezaFinal = pieza) => {
                /* ejecutar movimiento */
                celda.innerHTML = piezaFinal;
                celdaSeleccionada.innerHTML = '';
                celdaSeleccionada.classList.remove('seleccionada');
                celdaSeleccionada = null;
                clearHighlights();

                /* cambiar turno */
                turno = turno === 'blanco' ? 'negro' : 'blanco';
                indicador.textContent = `Turno: ${turno.charAt(0).toUpperCase() + turno.slice(1)}`;

                // Verificar jaque y posible fin de juego
                estaEnJaque(turno);
                verificarFinDeJuego(turno);
            };

            /* verificar si necesita promoción */
            const esBlanco = esPiezaBlanca(pieza);
            if (necesitaPromocion(pieza, hasta[0], esBlanco)) {
                // Mostrar menú de promoción
                mostrarMenuPromocion(celda, esBlanco, (piezaElegida) => {
                    completarMovimiento(piezaElegida);
                });
            } else {
                // Movimiento normal
                completarMovimiento();
            }
        }
    });
});