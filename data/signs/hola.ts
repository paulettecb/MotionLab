/**
 * Seña LSM: HOLA — metadata + fuentes + reglas propuestas (Task 15).
 * La lógica de detección vive en `logic/` (Task 16); aquí solo el conocimiento.
 *
 * ⚠️ Fuentes más débiles que SÍ/NO: "hola" no existe en Manos con Voz (verificado
 * en el texto completo del libro) y el PDF público de DIELSEME no trae fichas por
 * seña. Las referencias son videos de Wikisigns (CC BY-SA). Antes de calibrar
 * (Task 16): ver los videos y confirmar/corregir la descripción; idealmente cruzar
 * con video de una asociación de sordos mexicana. Hay variación regional real.
 */
import type { SignDefinition } from './si';

export const hola: SignDefinition = {
  id: 'hola',
  glosa: 'HOLA',
  tipo: { movimiento: 'dinamica', manos: 1 },
  variante:
    'Saludo de mano abierta con oscilación lateral (variante más extendida en video). ' +
    'Existen variantes regionales (p. ej. con origen en la frente, tipo saludo).',
  fuentes: [
    {
      titulo: 'Wikisigns LSM — "hola" (A) (video, CC BY-SA 4.0)',
      tipo: 'video',
      detalle: 'Entrada A del diccionario en video de Wikisigns',
      url: 'https://www.youtube.com/watch?v=q51NPnFAmgA',
    },
    {
      titulo: 'Wikisigns LSM — "hola" (B) y "hola" (videos, CC BY-SA 4.0)',
      tipo: 'video',
      detalle:
        'Variantes: youtube.com/watch?v=yxuffGl5ajM y youtube.com/watch?v=bjYNbxE9nRw',
      url: 'https://www.youtube.com/watch?v=yxuffGl5ajM',
    },
  ],
  componentes: {
    configuracion:
      'Mano abierta, cinco dedos extendidos (juntos o levemente separados). ' +
      '[Provisional: confirmar contra videos]',
    orientacion: 'Palma al frente (hacia el interlocutor/cámara).',
    ubicacion: 'Mano elevada: muñeca a la altura del hombro o más arriba, a un costado.',
    movimiento:
      'Oscilación lateral corta y repetida de la mano/muñeca (saludo), ≥2 ciclos.',
    noManual: 'Expresión amable / contacto visual. No exigido en MVP.',
  },
  predicados: [
    'fingerExtension(los 5 dedos) > 0.7 sostenido toda la ventana',
    'palmNormal() con componente z dominante hacia cámara (|nz| > 0.6; calibrar con mirror)',
    'muñeca por encima del hombro (pose landmark si activo; si no, tercio superior del frame calibrado)',
    'oscilación en x de muñeca: ≥2 cambios de signo de velocidad en 30–45 frames, amplitud > 0.04·anchoFrame',
  ],
  umbrales: {
    entrada: 'configuración + orientación sostenidas 10 frames y 2 ciclos de oscilación',
    salida: '<3 dedos extendidos, o 20 frames sin oscilación',
    debounceFrames: 5,
    ventanaFrames: 45,
  },
  fixtures: [], // Task 16
  estado: 'borrador',
};
