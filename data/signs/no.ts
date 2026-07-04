/**
 * Seña LSM: NO — metadata + fuentes + reglas propuestas (Task 15).
 * La lógica de detección vive en `logic/` (Task 16); aquí solo el conocimiento.
 */
import type { SignDefinition } from './si';

export const no: SignDefinition = {
  id: 'no',
  glosa: 'NO',
  tipo: { movimiento: 'dinamica', manos: 1 },
  variante:
    'Manos con Voz: pinza de tres dedos (pulgar+índice+medio se unen por las yemas). ' +
    'NO es el índice oscilante lateral (gesto cultural) que suponía el plan §3.2.',
  fuentes: [
    {
      titulo: 'Manos con Voz. Diccionario de LSM (Serafín/González, CONAPRED 2011)',
      tipo: 'diccionario',
      detalle:
        'p. 82, sección Antónimos (NO/SÍ): "Los dedos índice, medio y pulgar ' +
        'estirados, realizan un movimiento de unirse por las yemas." (OCR; cotejar foto)',
      url: 'https://archive.org/details/diccionario-de-lengua-de-senas-mexicana',
    },
    {
      titulo: 'DIELSEME. Estudio introductorio al léxico de la LSM (SEP/DEE)',
      tipo: 'estudio',
      detalle:
        'Rasgo no manual: la negación agrega movimiento de cabeza que acompaña ' +
        'la seña manual.',
      url: 'http://libreacceso.org/wp-content/uploads/2020/12/DIELSEME.pdf',
    },
  ],
  componentes: {
    configuracion: 'Pulgar, índice y medio extendidos; anular y meñique flexionados.',
    orientacion: 'Palma hacia el interlocutor/frente (tolerante).',
    ubicacion: 'Frente al cuerpo, altura pecho–hombro. No distintiva.',
    movimiento:
      'Los tres dedos se unen por las yemas (cierre de pinza) y reabren; típicamente repetido.',
    noManual:
      'Movimiento lateral de cabeza (negación) según DIELSEME. No exigido en MVP.',
  },
  predicados: [
    'Postura A (abierta): fingerExtension(pulgar|indice|medio) > 0.7 y fingerExtension(anular|meñique) < 0.3',
    'Postura B (cerrada): dist(yema pulgar, yema índice) y dist(yema pulgar, yema medio) < 0.25·longitudPalma, con anular/meñique flexionados',
    'Secuencia A→B (ideal A→B→A) dentro de 20 frames — máquina de estados en signSequencer',
  ],
  umbrales: {
    entrada: '1 ciclo A→B→A completo',
    salida: 'fingerExtension(anular|meñique) > 0.5, o 20 frames sin transición',
    debounceFrames: 5,
    ventanaFrames: 20,
  },
  fixtures: [], // Task 16
  estado: 'borrador',
};
