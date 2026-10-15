// El programa completo: 5 niveles con lecciones que se recorren en días, no en
// minutos. Cada lección tiene un objetivo, el contenido que enseña el coach, un
// ejercicio en sesión, una práctica en la vida real y la señal de dominio que el
// coach debe ver antes de darla por completada.
// Es puro dato (sin dependencias): lo usan el servidor y la app.

export const PROGRAMA = {
  1: {
    nombre: 'El Observador Inicial',
    tema: 'Hechos vs. juicios: descubre cómo interpretas la realidad.',
    objetivo:
      'Que la persona descubra que no ve el mundo como es sino según el observador que es, distinga hechos de juicios y aprenda a fundar los juicios que más la limitan, empezando por los que tiene sobre sí.',
    lecciones: [
      {
        id: '1.1',
        titulo: 'Tu punto de partida',
        objetivo: 'Conocer a la persona en profundidad y acordar para qué hace este camino.',
        contenido:
          'Entrevista inicial, sin enseñar teoría todavía. Explora con calma: qué le trae (el dolor o la incomodidad concreta: miedo a hablar en público, timidez, inseguridad, conflictos, vergüenza, no animarse a mostrar lo que sabe…), desde cuándo, en qué situaciones aparece y qué le cuesta hoy (en lo concreto), qué intentó antes, qué fortalezas tiene, cómo es su contexto (trabajo, vínculos), y cómo sería su vida si esto cambiara. Escucha la emoción detrás del relato.',
        ejercicio:
          'Pídele que te cuente la última vez que vivió eso que le duele, con detalle: dónde estaba, qué pasó, qué sintió en el cuerpo, qué se dijo a sí. Luego: "si dentro de dos meses esto hubiera cambiado, ¿en qué lo notarías?".',
        practica:
          'Durante dos días, anotar cada vez que aparece esa dificultad: la situación, qué sintió en el cuerpo y qué se dijo a sí.',
        dominio:
          'Guardaste su perfil con "actualizar_perfil" (al menos motivo, miedos y fortalezas) y declaró su propósito con "declarar_proposito".',
      },
      {
        id: '1.2',
        titulo: 'El observador que eres',
        objetivo: 'Comprender que los resultados dependen de las acciones, y las acciones del observador que somos.',
        contenido:
          'No vemos el mundo como es, vemos según el observador que somos (lenguaje, emociones, cuerpo, historia). Modelo OSAR: Observador → Sistema → Acciones → Resultados. Aprendizaje de primer orden (cambiar acciones) y de segundo orden (cambiar el observador, que abre acciones que antes no se veían). Ceguera cognitiva: "no sé que no sé".',
        ejercicio:
          'Tomen un resultado de su vida que no le gusta (ligado a su motivo). Recorran hacia atrás: ¿qué acciones lo producen?, ¿qué ve y qué no ve el observador que actúa así?, ¿qué tendría que ver distinto para actuar distinto?',
        practica:
          'Una vez por día, registrar una situación en la que otra persona interpretó lo mismo de forma distinta, y preguntarse qué vio el otro que yo no vi.',
        dominio:
          'Explica OSAR con sus palabras y lo aplica a su propio caso, distinguiendo aprendizaje de primer y de segundo orden.',
      },
      {
        id: '1.3',
        titulo: 'Afirmaciones y juicios',
        objetivo: 'Distinguir con soltura hechos verificables de interpretaciones.',
        contenido:
          'Afirmaciones: describen hechos, son verdaderas o falsas y se pueden verificar (un testigo estaría de acuerdo). Juicios: interpretaciones, válidos o inválidos, fundados o infundados; viven en quien juzga y dicen tanto de él como de lo juzgado. Trampas: juicios disfrazados de hechos ("es un irresponsable", "nunca me escucha"), palabras como "siempre", "nunca", "todos".',
        ejercicio:
          'Pídele que cuente una situación reciente que le molestó. Luego separen juntos, frase por frase, qué es hecho y qué es juicio. Después dale 8 frases mezcladas (algunas con trampa) para clasificar y justificar.',
        practica:
          'Diario de juicios: cada día, tres juicios que hizo (sobre otros o sobre sí) y al lado los hechos concretos que los sostienen, o la ausencia de ellos.',
        dominio: 'Clasifica sin errores frases con trampa y detecta por sí sola juicios disfrazados de hechos en su propio relato.',
      },
      {
        id: '1.4',
        titulo: 'Fundar juicios',
        objetivo: 'Aprender a fundar o infundar un juicio con las 5 condiciones.',
        contenido:
          'Las 5 condiciones: para qué lo emito, en qué dominio, con qué estándares, qué afirmaciones lo sostienen y qué afirmaciones lo contradicen. Un juicio fundado abre acción; uno infundado suele cerrar posibilidades. En psicología cognitiva se habla de distorsiones (catastrofizar, leer la mente, todo o nada, etiquetar): fundar juicios es una forma de revisarlas.',
        ejercicio:
          'Elijan un juicio que tenga sobre otra persona importante en su vida y recórranlo con las 5 condiciones, en voz alta. Pregunta por las afirmaciones que lo contradicen: suelen olvidarse.',
        practica:
          'Antes de reaccionar ante alguien en los próximos días, pasar el juicio por las 5 condiciones (aunque sea mentalmente) y anotar qué cambió.',
        dominio: 'Recorre las 5 condiciones sola, sin que le recuerdes cuáles son, y llega a una conclusión distinta de la inicial.',
      },
      {
        id: '1.5',
        titulo: 'Los juicios sobre ti',
        objetivo: 'Revisar los juicios maestros que tiene sobre sí y que sostienen su dolor.',
        contenido:
          'Juicios maestros ("soy tímido", "no sirvo para hablar", "soy un fraude"): se viven como identidad, no como interpretación. La voz crítica interna. Separar "soy" de "hice" (la vergüenza dice "soy malo"; la culpa, "hice algo mal"). Defusión: "estoy teniendo el pensamiento de que no sirvo" pone distancia. Autocompasión: tratarse como trataría a alguien que quiere.',
        ejercicio:
          'Identifiquen su juicio maestro más fuerte (mira su perfil). Fúndenlo con las 5 condiciones y reformúlenlo como un juicio acotado y abierto ("hoy me cuesta hablar ante grupos grandes; puedo aprender"). Pídele que lo diga en voz alta y que note qué pasa en el cuerpo.',
        practica:
          'Cada vez que aparezca la voz crítica: anotar el hecho, el juicio que se dijo y la reformulación acotada. Al final del día, una frase amable hacia sí.',
        dominio: 'Nombra su juicio maestro, lo funda con hechos y lo reformula con sus palabras de manera creíble para sí.',
      },
      {
        id: '1.6',
        titulo: 'Interpretaciones que abren posibilidades',
        objetivo: 'Elegir interpretaciones más poderosas ante los quiebres.',
        contenido:
          'Un quiebre es la interrupción del fluir; no es lo que pasa sino cómo se interpreta. No buscamos la interpretación "verdadera" sino la que abre más posibilidades de acción y sigue fundada en los hechos. Responsabilidad = habilidad para responder: de víctima ("me pasa") a protagonista ("¿qué puedo hacer?").',
        ejercicio:
          'Tomen un quiebre real y actual. Que construya tres interpretaciones distintas del mismo hecho y elija la que más acción le abre. Luego, ¿qué hará distinto desde ahí?',
        practica: 'Ante cada quiebre de la semana, generar dos interpretaciones antes de actuar y elegir conscientemente desde cuál responder.',
        dominio: 'Ante un quiebre propio genera interpretaciones alternativas fundadas y elige una desde el protagonismo, sin negar los hechos.',
      },
    ],
    evaluacion:
      'Evaluación integradora (toma una sesión entera). 1) Cuéntale una historia con 8 elementos (hechos, juicios y juicios disfrazados de hechos) para clasificar y justificar. 2) Pídele que funde en voz alta, con las 5 condiciones, un juicio de esa historia. 3) Pídele que aplique todo a su juicio maestro: cuál es, qué hechos lo sostienen y cómo lo reformula. Sé exigente: aprobar exige dominio, no memoria.',
  },
  2: {
    nombre: 'El Diseñador de Realidades',
    tema: 'Hablar es actuar: declaraciones que abren posibilidades.',
    objetivo:
      'Que la persona descubra que con su palabra crea realidades: que pueda poner límites, pedir perdón, agradecer, decir "no sé" y declarar el futuro que quiere, con autoridad y coherencia.',
    lecciones: [
      {
        id: '2.1',
        titulo: 'El lenguaje es acción',
        objetivo: 'Comprender que hablar no describe: genera realidad.',
        contenido:
          'Los tres postulados de la ontología del lenguaje. Los actos lingüísticos: afirmaciones, declaraciones, juicios, pedidos, ofertas y promesas. Las declaraciones cambian el mundo (un "sí, acepto", un "estás despedido", un "basta") y su poder depende de la autoridad de quien declara.',
        ejercicio:
          'Que identifique tres declaraciones que cambiaron su vida (propias o recibidas) y qué realidad crearon. Luego, una declaración que nunca hizo y le pesa.',
        practica: 'Durante dos días, observar y anotar declaraciones que escucha o hace, y qué posibilidades abrieron o cerraron.',
        dominio: 'Distingue los actos lingüísticos en ejemplos de su vida y explica por qué una declaración no es verdadera ni falsa.',
      },
      {
        id: '2.2',
        titulo: 'El poder del "no" y del "sí"',
        objetivo: 'Poder decir "no" sin culpa y dar a su "sí" un valor real.',
        contenido:
          'Sin "no" no hay "sí" con valor. Decir "no" protege la dignidad: los límites que no se declaran se convierten en resentimiento. Raíces psicológicas de la complacencia: miedo al rechazo, a decepcionar, necesidad de aprobación. Un "no" puede ser firme y amable a la vez: reconocer al otro, declarar el límite, ofrecer alternativa si la hay.',
        ejercicio:
          'Busquen juntos un "no" que viene postergando. Ensáyenlo en juego de rol: tú haces de la otra persona e insistes. Trabaja el cuerpo y la voz al decirlo, y la culpa que aparece después.',
        practica: 'Decir al menos un "no" real esta semana (aunque sea pequeño) y anotar qué sintió antes, durante y después, y qué pasó en realidad.',
        dominio: 'Sostiene un "no" claro y amable ante tu insistencia, sin justificarse de más ni ceder, y nombra qué le pasaba por dentro.',
      },
      {
        id: '2.3',
        titulo: '"No sé", "gracias" y "perdón"',
        objetivo: 'Usar las declaraciones que abren el aprendizaje y reparan los vínculos.',
        contenido:
          '"No sé" abre la puerta al aprendizaje (el que cree saber no aprende). "Gracias" reconoce lo recibido y cambia el estado de ánimo. "Perdón" tiene dos caras: pedirlo (hacerse cargo sin excusas) y otorgarlo (soltar el reclamo para liberarse, que no es olvidar ni justificar). "Me equivoqué" como acto de grandeza.',
        ejercicio:
          'Que elija a alguien a quien le debe un "gracias" o un "perdón" y lo formule en voz alta, en primera persona, como si estuviera frente a esa persona. Dale devolución de lo que transmite.',
        practica: 'Hacer una de esas declaraciones pendientes en la vida real (en persona, por mensaje o por carta) y anotar qué se movió.',
        dominio: 'Formula un perdón o un agradecimiento sin justificaciones ni "peros", y distingue perdonar de olvidar.',
      },
      {
        id: '2.4',
        titulo: 'Declarar quiebres y compromisos',
        objetivo: 'Declarar lo que no va más y comprometerse con un futuro.',
        contenido:
          'La declaración de quiebre ("esto no puede seguir así") es el primer paso de todo cambio. La declaración de compromiso crea una identidad futura ("soy alguien que habla aunque tenga miedo"). Diferencia entre deseo ("me gustaría") y compromiso ("voy a"). Intenciones de implementación: "cuando pase X, haré Y".',
        ejercicio:
          'Que declare en voz alta el quiebre ligado a su propósito y luego un compromiso concreto, en presente y con autoridad. Ajusten juntos hasta que suene creíble para quien lo dice.',
        practica: 'Escribir su declaración de compromiso y leerla cada mañana durante tres días; cada noche anotar una acción que la honró.',
        dominio: 'Declara su quiebre y su compromiso con voz firme, sin condicionales ("intentaré", "me gustaría"), ligados a su propósito.',
      },
      {
        id: '2.5',
        titulo: 'Coherencia y autoridad',
        objetivo: 'Sostener las declaraciones con acciones para construir confianza en sí.',
        contenido:
          'Declarar sin actuar en consecuencia erosiona la confianza propia y ajena. La autoestima se construye cumpliéndose promesas pequeñas. Diseñar un plan de acciones mínimas, concretas y frecuentes que sostengan la declaración. Recaídas: no anulan el compromiso; se reconocen y se retoma.',
        ejercicio:
          'Diseñen juntos un plan de 7 días con una acción pequeña por día que sostenga su declaración de compromiso. Que lo diga en voz alta y anticipe qué podría hacerla abandonar.',
        practica: 'Ejecutar el plan de 7 días y marcar cada día cumplido; si falla un día, anotar qué pasó sin castigarse y retomar.',
        dominio: 'Tiene un plan concreto y realista, y puede explicar cómo va a responder si falla un día.',
      },
    ],
    evaluacion:
      'Evaluación integradora. 1) Juego de rol: tú le pides algo que no quiere hacer e insistes; debe sostener un "no" firme y amable. 2) Caso: debe pedir un perdón o dar un agradecimiento pendiente, en primera persona. 3) Que formule su declaración de compromiso ligada a su propósito y explique qué posibilidades abre. Evalúa también la voz y la convicción, no solo las palabras.',
  },
  3: {
    nombre: 'El Maestro de la Coherencia Corporal',
    tema: 'Lenguaje, emoción y cuerpo alineados.',
    objetivo:
      'Que la persona alinee lo que dice, lo que siente y lo que muestra su cuerpo; que sepa regular el miedo y la vergüenza en el momento y hablar con presencia bajo presión.',
    lecciones: [
      {
        id: '3.1',
        titulo: 'Los tres dominios',
        objetivo: 'Comprender cómo lenguaje, emoción y cuerpo se afectan entre sí.',
        contenido:
          'Lenguaje, emoción y cuerpo forman una unidad coherente: un cambio en uno mueve a los otros. La emoción es una predisposición para la acción. Conciencia corporal: notar respiración, tensión, postura. El cuerpo guarda la memoria de nuestras experiencias.',
        ejercicio:
          'Escaneo corporal guiado de 2 minutos. Luego que recuerde la situación que le duele y note qué cambia en el cuerpo (respiración, hombros, mandíbula, estómago). Si la cámara está activa, dile lo que ves.',
        practica: 'Tres veces por día, una pausa de 30 segundos para notar respiración, postura y emoción, y anotarlo.',
        dominio: 'Describe con precisión qué le pasa en el cuerpo ante su dificultad y cómo eso afecta lo que dice.',
      },
      {
        id: '3.2',
        titulo: 'El cuerpo habla',
        objetivo: 'Reconocer y elegir posturas que transmiten apertura y seguridad.',
        contenido:
          'Posturas de cierre (hombros adelante, brazos cruzados, mirada baja) y de apertura (eje vertical, pecho abierto, mirada al frente, manos visibles). Centro y enraizamiento: pies firmes, peso repartido. La mirada sostenida. Gestos que acompañan el sentido. No presentes como hecho el efecto hormonal de las "posturas de poder": no se confirmó.',
        ejercicio:
          'Con la cámara activa (pídeselo y que se vea de la cintura para arriba): obsérvala, describe lo que ves con precisión y corrígela paso a paso (pies, eje, hombros, mentón, mirada, manos). Que diga una frase en postura de cierre y luego en apertura, y note la diferencia. Sin cámara, guíala para que se describa.',
        practica: 'Antes de cada conversación importante del día, un minuto de postura de centro; anotar cómo se sintió al hablar.',
        dominio: 'Adopta por sí sola una postura de centro y apertura y la sostiene mientras habla; detecta cuándo se cierra.',
      },
      {
        id: '3.3',
        titulo: 'La voz',
        objetivo: 'Usar la respiración, el ritmo y las pausas para hablar con calma y autoridad.',
        contenido:
          'Respiración diafragmática (el abdomen se expande al inhalar). Respiración 4-4-6 para bajar la activación. Ritmo: hablar rápido suele ser miedo a ocupar espacio. La pausa como poder: después de una idea importante, silencio. Volumen, proyección y modulación: terminar las frases hacia abajo (afirmación), no hacia arriba (pregunta).',
        ejercicio:
          'Respiración guiada. Luego que lea o diga un párrafo tres veces: rápido, normal y con pausas marcadas. Devuélvele concretamente qué escuchas (ritmo, muletillas, finales de frase, volumen) y que lo repita mejorando una cosa por vez.',
        practica: 'Leer en voz alta 3 minutos por día con pausas marcadas, y grabarse una vez para escucharse.',
        dominio: 'Habla con pausas y ritmo tranquilo, termina las frases con firmeza y lo sostiene aunque le cueste.',
      },
      {
        id: '3.4',
        titulo: 'Gestionar el miedo y la vergüenza',
        objetivo: 'Regular las emociones intensas en el momento en que aparecen.',
        contenido:
          'El miedo y la vergüenza son normales; el problema es la evitación, que los agranda. Ventana de tolerancia: si la activación es demasiado alta, primero regular (respirar, sentir los pies, mirar alrededor: 5 cosas que ves, 4 que tocas…). Nombrar la emoción la baja ("esto es miedo, y está bien"). Exposición gradual: una escalera de situaciones de menor a mayor dificultad (0 a 10), subiendo un escalón por vez y quedándose hasta que baje la ansiedad.',
        ejercicio:
          'Armen juntos su escalera de exposición: 6 a 8 situaciones de su dificultad, puntuadas de 0 a 10. Elijan el primer escalón (3 o 4 de 10). Practiquen ahí mismo el protocolo: nombrar, respirar, enraizar, actuar.',
        practica: 'Subir el primer escalón de la escalera al menos dos veces en la semana y anotar la ansiedad antes, durante y después (0 a 10).',
        dominio: 'Tiene su escalera de exposición y aplica por sí sola el protocolo de regulación cuando le propones imaginar la situación.',
      },
      {
        id: '3.5',
        titulo: 'Presencia bajo presión',
        objetivo: 'Integrar lenguaje, emoción y cuerpo en situaciones exigentes.',
        contenido:
          'La presencia es estar aquí: atención en el otro y en el mensaje, no en uno mismo. Preparación: qué quiero que se lleve el otro, tres ideas, la primera frase. Ante un bloqueo: pausa, respiración, volver a la idea central. Equivocarse en público y seguir es una habilidad, no un fracaso.',
        ejercicio:
          'Juego de rol de presión creciente en tres rondas (por ejemplo: hablar ante un grupo que se muestra escéptico, interrupciones, una pregunta incómoda). Entre rondas, devolución concreta de voz, cuerpo (con cámara si es posible) y emoción.',
        practica: 'Subir el siguiente escalón de su escalera de exposición en la vida real y anotar qué recursos usó.',
        dominio: 'Sostiene las tres rondas con coherencia, se recupera de un bloqueo y corrige lo que le señalas.',
      },
    ],
    evaluacion:
      'Evaluación integradora: juego de rol de alta presión ligado a su dificultad real (por ejemplo, una exposición ante una audiencia crítica o una negociación tensa), en tres rondas de exigencia creciente. Pídele la cámara para ver su cuerpo; sin cámara, que describa su postura y la ajuste. Evalúa ritmo, pausas, seguridad vocal, postura, regulación emocional y capacidad de corregir una incoherencia cuando se la señalas.',
  },
  4: {
    nombre: 'El Arquitecto de Compromisos',
    tema: 'Pedidos, ofertas y promesas: coordinar acciones sin malentendidos.',
    objetivo:
      'Que la persona pida lo que necesita sin miedo, ofrezca su valor, cumpla y renegocie sus promesas, y transforme quejas en reclamos responsables.',
    lecciones: [
      {
        id: '4.1',
        titulo: 'Anatomía del pedido',
        objetivo: 'Hacer pedidos efectivos.',
        contenido:
          'Un pedido efectivo: quién pide, a quién, acción concreta, condiciones de satisfacción, plazo y trasfondo compartido. Pedidos implícitos (esperar que el otro adivine). Las quejas son pedidos no hechos. El miedo a pedir: "molesto", "me van a decir que no", "debería poder solo".',
        ejercicio:
          'Que identifique algo que necesita y no está pidiendo. Formúlenlo juntos con todos los componentes y que lo diga en voz alta como si estuviera frente a la persona.',
        practica: 'Hacer dos pedidos reales y completos esta semana; anotar qué pasó y qué miedo apareció antes.',
        dominio: 'Formula pedidos con acción, condiciones de satisfacción y plazo sin que se lo recuerdes.',
      },
      {
        id: '4.2',
        titulo: 'Respuestas y ofertas',
        objetivo: 'Responder con libertad y ofrecer su valor.',
        contenido:
          'Ante un pedido: aceptar, declinar, contraofertar o comprometerse a responder más tarde. Contraofertar es una forma de cuidar el vínculo y a uno mismo. Ofertas: ofrecer lo que sabe y puede, en lugar de esperar a que lo descubran (clave para quien no se anima a mostrar su intelecto o su talento).',
        ejercicio:
          'Juego de rol: tú le haces pedidos difíciles (algunos razonables, otros abusivos) y responde eligiendo conscientemente. Luego, que formule una oferta de su valor en un ámbito que le importe.',
        practica: 'Hacer una oferta real de algo que sabe o puede aportar, y responder al menos un pedido con una contraoferta.',
        dominio: 'Responde pedidos difíciles eligiendo entre las cuatro respuestas y formula una oferta clara de su valor.',
      },
      {
        id: '4.3',
        titulo: 'El ciclo de la promesa',
        objetivo: 'Gestionar promesas: cumplir, renegociar o revocar a tiempo.',
        contenido:
          'Ciclo de la promesa: preparación, negociación, cumplimiento y declaración de satisfacción. Una promesa responsable se cumple o se renegocia antes del plazo. Prometer de más por complacer daña la confianza. La relación con las promesas a uno mismo.',
        ejercicio:
          'Que revise sus promesas abiertas (a otros y a sí): cuáles va a cumplir, cuáles renegociar y cuáles revocar. Ensayen una renegociación en voz alta.',
        practica: 'Renegociar o revocar responsablemente al menos una promesa que sabe que no va a cumplir, y cerrar una pendiente.',
        dominio: 'Distingue las etapas del ciclo y ensaya una renegociación sin justificarse de más.',
      },
      {
        id: '4.4',
        titulo: 'De la queja al reclamo',
        objetivo: 'Transformar quejas y resentimiento en reclamos responsables.',
        contenido:
          'La queja habla del otro y no cambia nada; el reclamo responsable se hace a quien corresponde: hechos (qué se prometió y qué pasó), impacto, pedido de reparación y nuevo compromiso, sin descalificar a la persona. El resentimiento es un reclamo no hecho.',
        ejercicio:
          'Que identifique una queja recurrente (a quién le reclama en silencio). Construyan el reclamo responsable y ensáyenlo: tú haces de la otra persona y te pones a la defensiva.',
        practica: 'Hacer un reclamo responsable real (o, si no es el momento, escribirlo completo) y anotar el resultado.',
        dominio: 'Hace un reclamo con hechos, impacto y pedido, sin juicios descalificadores, aun ante tu defensa.',
      },
      {
        id: '4.5',
        titulo: 'Confianza',
        objetivo: 'Construir y reparar la confianza.',
        contenido:
          'La confianza se apoya en juicios de sinceridad, competencia, confiabilidad (cumplir) e involucramiento (le importo). Se construye en pequeñas promesas cumplidas. Reparar la confianza: reconocer, hacerse cargo, reparar y prometer de nuevo con cuidado.',
        ejercicio:
          'Que elija un vínculo donde la confianza está dañada (en cualquier dirección) y diagnostique qué dominio falló. Diseñen la conversación de reparación y ensáyenla.',
        practica: 'Dar un paso concreto de reparación de confianza en ese vínculo y anotar qué se movió.',
        dominio: 'Diagnostica qué dominio de la confianza falló y diseña una conversación de reparación concreta.',
      },
    ],
    evaluacion:
      'Evaluación integradora en dos tiempos. Tú haces de la otra persona (alguien de su vida real). 1) Debe hacerte un pedido real y completo; respóndele con una contraoferta o una duda razonable que tiene que gestionar. 2) Dile que pasó el plazo y no cumpliste: debe hacerte un reclamo responsable y cerrar con un nuevo compromiso. Ponte a la defensiva para exigirle.',
  },
  5: {
    nombre: 'El Líder Conversacional',
    tema: 'Escucha, estados de ánimo y conversaciones difíciles.',
    objetivo:
      'Que la persona escuche de verdad, lea y diseñe estados de ánimo, sostenga conversaciones difíciles cuidando la relación y lidere desde su propósito.',
    lecciones: [
      {
        id: '5.1',
        titulo: 'Escuchar de verdad',
        objetivo: 'Escuchar las inquietudes detrás de lo que se dice.',
        contenido:
          'Escuchar = oír + interpretar; lo dicho y lo escuchado nunca coinciden. Escuchar inquietudes: ¿qué le importa a esta persona? Escucha activa: parafrasear, verificar, preguntar antes de responder. Las conversaciones privadas que nos impiden escuchar.',
        ejercicio:
          'Tú le cuentas un problema con carga emocional; solo puede escuchar, parafrasear y preguntar (nada de consejos). Devolución de qué escuchó y qué se perdió.',
        practica: 'En dos conversaciones reales por día, parafrasear antes de responder y anotar qué descubrió.',
        dominio: 'Parafrasea con precisión, pregunta por la inquietud de fondo y no se apura a responder ni a aconsejar.',
      },
      {
        id: '5.2',
        titulo: 'Estados de ánimo',
        objetivo: 'Reconocer y diseñar estados de ánimo propios y ajenos.',
        contenido:
          'Los estados de ánimo son el trasfondo desde el que actuamos: resentimiento frente a aceptación y perdón; resignación frente a ambición; ansiedad frente a confianza. Se pueden diseñar desde el lenguaje (revisar juicios), el cuerpo (postura, respiración) y la emoción. Nombrarlos en otros como hipótesis, no como diagnóstico.',
        ejercicio:
          'Que identifique su estado de ánimo dominante en el área de su dificultad y los juicios que lo sostienen. Diseñen juntos cómo moverlo (un juicio nuevo, una práctica corporal, una acción).',
        practica: 'Registrar su estado de ánimo dos veces por día y aplicar una vez el diseño acordado.',
        dominio: 'Nombra estados de ánimo con sus juicios de base y diseña un cambio concreto para el suyo.',
      },
      {
        id: '5.3',
        titulo: 'Conversaciones difíciles',
        objetivo: 'Preparar y sostener las conversaciones que viene evitando.',
        contenido:
          'Preparación: qué quiero lograr, qué le importa al otro, qué temo, qué hechos tengo. Apertura cuidadosa (para qué quiero hablar), hechos antes que juicios, impacto en primera persona, escucha de la otra versión, pedido o acuerdo. Mantener la calma cuando el otro se altera: volver a la escucha.',
        ejercicio:
          'Elijan una conversación pendiente real de su vida. Prepárenla con el esquema y ensáyenla: tú haces de la otra persona con resistencia realista. Repitan la parte que salió peor.',
        practica: 'Tener esa conversación (o una más pequeña de la misma familia) y anotar qué funcionó y qué no.',
        dominio: 'Sostiene la conversación ensayada con hechos, impacto, escucha y pedido, aun ante tu resistencia.',
      },
      {
        id: '5.4',
        titulo: 'Dar y recibir devolución',
        objetivo: 'Dar feedback que ayude y recibirlo sin defenderse.',
        contenido:
          'Una devolución útil es un juicio fundado: hechos concretos, impacto, sugerencia y reconocimiento de lo que funciona. Recibir devolución: escuchar, agradecer, preguntar, y luego decidir qué tomar. Reconocer a otros con precisión fortalece vínculos.',
        ejercicio:
          'Que te dé una devolución sobre algo real (por ejemplo, sobre cómo le acompañaste en el programa); luego tú le das una devolución exigente y practica recibirla.',
        practica: 'Dar un reconocimiento preciso y una devolución de mejora a alguien real, y pedir una devolución para sí.',
        dominio: 'Da una devolución fundada y recibe una exigente sin justificarse, con curiosidad.',
      },
      {
        id: '5.5',
        titulo: 'Liderar con propósito',
        objetivo: 'Integrar todo el camino y proyectarlo.',
        contenido:
          'Liderar es abrir posibilidades para otros: conversaciones para posibilidades, visión compartida, inspirar acción. Repaso integrador: observador, declaraciones, coherencia corporal, compromisos y escucha. ¿Quién es hoy frente a su dolor inicial?',
        ejercicio:
          'Revisen juntos su recorrido (perfil, propósito, evolución). Que hable dos minutos, con presencia, sobre quién es hoy y qué quiere construir: tú le das devolución integral.',
        practica: 'Diseñar su plan de práctica para los próximos 30 días después del programa y compartirlo con alguien de confianza.',
        dominio: 'Integra las distinciones del programa en un relato propio y un plan de continuidad concreto.',
      },
    ],
    evaluacion:
      'Evaluación integradora: juego de rol de alta tensión. Haz de alguien molesto o resentido con la persona (de su vida real), con objeciones y dureza. Debe escuchar e indagar antes de responder, nombrar tu estado de ánimo como hipótesis, sostener la calma y llevar la conversación a un acuerdo concreto sin romper la relación.',
  },
};

export const NIVELES = Object.fromEntries(Object.entries(PROGRAMA).map(([n, nivel]) => [n, nivel.nombre]));

/** Lecciones de un nivel, en orden. */
export const leccionesDe = (nivel) => PROGRAMA[nivel]?.lecciones ?? [];
