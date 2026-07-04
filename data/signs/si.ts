/**
 * Seña LSM: SÍ — metadata + fuentes + reglas propuestas (Task 15).
 * La lógica de detección vive en `logic/` (Task 16); aquí solo el conocimiento.
 *
 * NOTA: `SignDefinition` se define aquí temporalmente y lo reutilizan no.ts y
 * hola.ts. En la Task 16 moverlo a `data/signs/types.ts` (o `types/` global).
 */

export type SignEstado = 'borrador' | 'calibrada' | 'validada';

export interface SignFuente {
  titulo: string;
  tipo: 'diccionario' | 'estudio' | 'video';
  detalle: string; // página, sección o descripción del video
  url: string;
}

export interface SignComponentes {
  /** 1. Configuración de dedos */
  configuracion: string;
  /** 2. Orientación de la palma */
  orientacion: string;
  /** 3. Ubicación respecto al cuerpo */
  ubicacion: string;
  /** 4. Movimiento */
  movimiento: string;
  /** 5. Componente no manual */
  noManual: string;
}

export interface SignUmbrales {
  /** Condición de entrada al estado "detectado" (umbral alto) */
  entrada: string;
  /** Condición de salida (umbral bajo — histéresis) */
  salida: string;
  /** Frames consecutivos requeridos (debounce) */
  debounceFrames: number;
  /** Ventana temporal para movimiento, en frames */
  ventanaFrames: number;
}

export interface SignDefinition {
  id: string;
  glosa: string;
  tipo: { movimiento: 'estatica' | 'dinamica'; manos: 1 | 2 };
  /** Qué variante regional/de diccionario se implementa. La UI dice "según [fuente]". */
  variante: string;
  fuentes: SignFuente[]; // regla: mínimo 2
  componentes: SignComponentes;
  /** Predicados geométricos derivados (descriptivos; Task 16 los implementa) */
  predicados: string[];
  umbrales: SignUmbrales;
  /** Rutas a fixtures en tests/fixtures/ (se llenan en Task 16) */
  fixtures: string[];
  estado: SignEstado;
  notas?: string;
}

export const si: SignDefinition = {
  id: 'si',
  glosa: 'SÍ',
  tipo: { movimiento: 'dinamica', manos: 1 },
  variante:
    'Manos con Voz: letra "i" (puño con meñique extendido) flexionando el meñique. ' +
    'NO es la variante "puño que asiente" que suponía el plan §3.2.',
  fuentes: [
    {
      titulo: 'Manos con Voz. Diccionario de LSM (Serafín/González, CONAPRED 2011)',
      tipo: 'diccionario',
      detalle:
        'p. 86, sección Antónimos (SÍ/NO): "Se hace una letra i, y se encoge y ' +
        'estira el dedo meñique." (OCR del texto completo; cotejar foto en Task 16)',
      url: 'https://archive.org/details/diccionario-de-lengua-de-senas-mexicana',
    },
    {
      titulo: 'Wikisigns LSM — "sí" (video, CC BY-SA 4.0)',
      tipo: 'video',
      detalle: 'También "sí, cierto, exactamente": youtube.com/watch?v=qanUoYgNKdA',
      url: 'https://www.youtube.com/watch?v=1swdAmdsorE',
    },
  ],
  componentes: {
    configuracion:
      'Letra "i" LSM: puño cerrado (índice, medio y anular flexionados, pulgar recogido) ' +
      'con meñique extendido.',
    orientacion: 'Palma hacia el interlocutor/cámara; tolerante de frontal a lateral.',
    ubicacion: 'Frente al cuerpo, zona pecho–hombro. No distintiva: ser tolerante.',
    movimiento:
      'El meñique se encoge y estira repetidamente (≥2 ciclos); la mano casi no se traslada.',
    noManual: 'Asentimiento de cabeza habitual. No exigido en MVP (sin FaceLandmarker).',
  },
  predicados: [
    'fingerExtension(indice|medio|anular) < 0.3 sostenido toda la ventana',
    'fingerExtension(meñique) oscila: cruza <0.4 y >0.7 alternadamente, ≥2 ciclos en 30 frames',
    'traslación de muñeca < 0.03·altoFrame (mano quieta: distingue de NO y HOLA)',
  ],
  umbrales: {
    entrada: '2 ciclos completos de meñique + configuración sostenida 10 frames',
    salida: 'fingerExtension(indice|medio|anular) > 0.5, o 15 frames sin ciclo',
    debounceFrames: 5,
    ventanaFrames: 30,
  },
  fixtures: [], // Task 16
  estado: 'borrador',
};
