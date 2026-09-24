// Genera templates/contrato-template.docx a partir del texto legal real de
// "Plantilla Contrato 2026.docx" (copia de Fundación Gabo), parametrizando
// solo los datos que cambian por propuesta. Los datos del CONTRATISTA
// (Ticketcode / DEYRA S.A.S.) quedan fijos — Ticketcode es siempre el
// contratista en estos contratos.
//
// Uso: node scripts/generate-contract-template.mjs
import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";

const CONTRATISTA = {
  nombre: "JOHN ALEXANDER VÁSQUEZ PEÑA",
  cedula: "7.702.392 expedida en Neiva, Huila",
  empresa: "DEYRA S.A.S.",
  nit: "901.860.557-8",
  matricula: "03858387",
  direccion: "Transversal 24 No. 54 – 24 de Bogotá",
};

function h(text) {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true })],
  });
}

function p(children, opts = {}) {
  const runs = Array.isArray(children) ? children : [children];
  return new Paragraph({
    spacing: { after: 150 },
    children: runs.map((c) => (typeof c === "string" ? new TextRun(c) : new TextRun(c))),
    ...opts,
  });
}

function tag(name) {
  return { text: `{${name}}`, bold: false };
}
function boldTag(name) {
  return { text: `{${name}}`, bold: true };
}

const title = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
  children: [
    new TextRun({ text: "CONTRATO DE PRESTACIÓN DE SERVICIOS NÚMERO ", bold: true }),
    new TextRun({ text: "{contrato_numero}", bold: true }),
  ],
});

const subtitle = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 300 },
  children: [
    new TextRun({
      text: `DE FECHA {contrato_fecha_texto} CELEBRADO ENTRE ${CONTRATISTA.empresa} Y {contratante_empresa}`,
      bold: true,
    }),
  ],
});

const intro = p([
  "Entre los suscritos ",
  boldTag("contratante_representante_legal"),
  " identificado(a) con la Cédula de Ciudadanía No. ",
  tag("contratante_cedula"),
  " expedida en ",
  tag("contratante_cedula_ciudad"),
  ", domiciliado y residente en la ciudad de ",
  tag("contratante_direccion_ciudad"),
  ", actuando en su calidad de Representante Legal de la empresa ",
  boldTag("contratante_empresa"),
  ", entidad identificada con el NIT ",
  tag("contratante_nit"),
  " domiciliada en la ciudad de ",
  tag("contratante_ciudad"),
  ", y quien para los efectos del presente contrato se denominará, EL CONTRATANTE, por una parte; y por la otra, ",
  `${CONTRATISTA.nombre} identificado con la cédula de ciudadanía No. ${CONTRATISTA.cedula}, quien actúa en nombre y representación de ${CONTRATISTA.empresa}, sociedad identificada con NIT. ${CONTRATISTA.nit} de conformidad con el Certificado de Existencia y Representación legal expedido por la Cámara de Comercio de Bogotá, mediante matrícula No. ${CONTRATISTA.matricula}, quien para los efectos del presente contrato se denominará EL CONTRATISTA, hemos convenido en celebrar el presente CONTRATO DE PRESTACIÓN DE SERVICIOS, teniendo en cuenta las siguientes consideraciones:`,
]);

const considerandos = [
  p(
    "Que el CONTRATISTA utiliza la marca comercial y opera la plataforma denominada TICKETCODE (LA PLATAFORMA) la cual ofrece las herramientas necesarias para realizar registro, venta de boletería electrónica, acreditaciones, control de acceso en cualquier tipo de evento y obtención de data calificada apoyándose en aplicaciones de Inteligencia Artificial del flujo de los asistentes y sus interacciones en eventos gratuitos o pagos en cualquier parte del mundo, de forma altamente eficiente y con calidad profesional."
  ),
  p(
    "Que, para el desarrollo del objeto del presente contrato, EL CONTRATANTE a través del presente instrumento, contratará los servicios que le prestará EL CONTRATISTA."
  ),
  p(
    "Que la propuesta presentada por el CONTRATISTA y aprobada por EL CONTRATANTE hace parte integral del presente contrato y contiene en detalle las características del servicio que deben ser tenidas en cuenta."
  ),
  p(
    "Por lo anterior, las partes celebran el presente contrato, el cual se regirá por las siguientes cláusulas:"
  ),
];

const clausulas = [
  h("PRIMERA: OBJETO"),
  p([
    "El OBJETO GENERAL del contrato consiste en la prestación de los servicios integrales de la plataforma (TICKETCODE) para la gestión y producción logística que involucra el acompañamiento y el soporte técnico especializado en operación logística de eventos, suministro de equipos, transferencia de conocimiento, habilitación de múltiples funciones de gestión, organización, control, registro, acreditación, entrega de kits, control de acceso, módulo de Inteligencia Artificial para realizar actividades de networking, obtención de información real y segmentada de todo el flujo en tiempo real de los participantes al evento: ",
    boldTag("evento_nombre"),
    " (EL EVENTO) cubriendo todos los requerimientos relacionados en la propuesta aprobada por EL CONTRATANTE en la realización y producción del EVENTO. Esta operación es transversal y cubre el ANTES (apoyo y/o acompañamiento en la configuración, parametrización y publicación del EVENTO), DURANTE (suministro de personal/capacitación de personal suministrado por el organizador, suministro de equipos, producción logística de registro, acreditación y control de acceso de EL EVENTO) y DESPUÉS (entrega de informes, suministro de DATA real y segmentada de todo el flujo de asistentes y participantes al EVENTO).",
  ]),

  h("SEGUNDA: ACTIVIDADES ESPECÍFICAS DEL CONTRATO"),
  p(
    "Las actividades específicas a desarrollar para el cumplimiento del objeto del contrato se encuentran definidas y discriminadas en la propuesta aprobada entre las partes, que hace parte fundamental del presente contrato y de conformidad con los requerimientos efectuados por el solicitante."
  ),
  p([boldTag("objeto_particular")]),
  p(
    "Nota: Cuando la asistencia real supere el valor del aforo esperado se liquidará y cobrará el excedente en el pago final acordado."
  ),
  h("CONDICIONES Y OBSERVACIONES ESPECÍFICAS DEL SERVICIO"),
  p([
    "Tiempo y Duración de la prestación del Servicio: Del ",
    tag("tiempo_servicio_inicio_texto"),
    " al ",
    tag("tiempo_servicio_fin_texto"),
  ]),
  p(
    "PARÁGRAFO: No obstante a que los días de producción del evento sean los anteriormente definidos, EL CONTRATISTA prestará asesoría y acompañamiento en toda la etapa de configuración, parametrización y puesta en marcha del EVENTO, durante los días previos y desde la firma del presente contrato, en los tiempos y horarios definidos y acordados entre LAS PARTES."
  ),
  p([
    "Valor del contrato y forma de pago: El valor del contrato es por valor de ",
    boldTag("valor_contrato_letras"),
    " ($",
    tag("valor_contrato_numero"),
    ") más IVA (19%) y la forma de pago definida según la propuesta comercial aprobada de la siguiente manera:",
  ]),
  p([tag("forma_pago_texto")]),
  p(
    "EL CONTRATANTE debe cumplir con todos los requerimientos previos de configuración y alistamiento del EVENTO en la plataforma de EL CONTRATISTA."
  ),

  h("TERCERA: OBLIGACIONES DEL CONTRATISTA"),
  p(
    "Sin perjuicio de las demás obligaciones contenidas en el presente contrato, EL CONTRATISTA se compromete a: Cumplir en forma oportuna, eficiente e idónea con el servicio contratado; prestar el servicio de conformidad con el alcance definido en el presente documento; garantizar la operatividad y cumplimiento de los objetivos y especificaciones señaladas en el presente contrato; gestionar con toda su capacidad, experiencia y pericia el proceso de la boletería para lograr que el flujo de venta, registro y control de acceso funcionen de manera eficiente, garantizando la confiabilidad e integridad y seguridad en la DATA y disminuyendo al mínimo posible el fraude e ingreso de personal sin su debida acreditación; iniciar la prestación del servicio en las fechas y horas determinadas por EL CONTRATANTE durante EL EVENTO; habilitar el modo administrador en su plataforma y dar acceso al CONTRATANTE para que este pueda realizar la configuración del EVENTO y tener acceso en todo momento a la información relacionada con las visitas, al formulario de registro y el acceso durante la realización del evento; mantener en reserva las informaciones a las que pueda tener acceso en desarrollo del objeto del presente contrato; abstenerse de utilizar la marca o el logo de EL CONTRATANTE o del EVENTO en publicidad o información que no tenga relación directa con EL EVENTO; llevar el control directo del personal que destine para dar cumplimiento al objeto de este contrato y supervisar durante toda la prestación del servicio; responder por las actuaciones, ya sea por acción u omisión, del personal que contrate para el cumplimiento del presente contrato; pagar oportunamente todos los salarios, honorarios, compensaciones, auxilios laborales, prestaciones sociales y aportes parafiscales del personal que utilice para la ejecución de este contrato; y las demás que EL CONTRATANTE le solicite dentro del desarrollo de las actividades propias, similares o conexas derivadas de la ejecución del presente contrato."
  ),

  h("CUARTA: OBLIGACIONES DEL CONTRATANTE"),
  p(
    "Sin perjuicio de las demás obligaciones contenidas en el presente contrato, EL CONTRATANTE se compromete a: cumplir con los lineamientos y condiciones establecidas en el documento de Términos y condiciones de la compraventa de boletería y de aceptación del cargo por servicio, que hace parte integral del presente contrato; cumplir con los requerimientos y cronogramas que realice EL CONTRATISTA (para este fin, EL CONTRATANTE enviará un documento/notificación para el inicio de las actividades propias del evento); pagar oportunamente y en la forma convenida en el presente contrato, el valor del anticipo y del remanente de acuerdo con las condiciones definidas en el presente documento; cumplir con los componentes del acuerdo comercial definido entre las partes; cumplir de manera adecuada con el objetivo del contrato en cuanto a suministro de información y requerimientos de EL CONTRATISTA para el adecuado cumplimiento del mismo; y las demás que se deriven de la naturaleza del presente contrato."
  ),
  p(
    "PARÁGRAFO: El incumplimiento de los requerimientos puede afectar el adecuado desempeño y los tiempos de ejecución estimados y será responsabilidad del CONTRATANTE."
  ),

  h("QUINTA: INICIO DEL CONTRATO"),
  p(
    "El contrato se dará por iniciado con la firma de este documento y un acta de inicio previamente suscrita entre las partes."
  ),

  h("SEXTA: GARANTÍAS"),
  p(
    "EL CONTRATISTA se obliga para asegurar el cumplimiento del presente Contrato a constituir a favor de EL CONTRATANTE las siguientes Garantías: Póliza de Buen Manejo del Anticipo, en cuantía equivalente al valor total del anticipo con una vigencia igual al plazo de ejecución del mismo y de sus prórrogas, si las hubiere, y tres (3) meses más; Póliza de Cumplimiento, en cuantía equivalente al 20% del valor del CONTRATO con una vigencia igual al plazo de ejecución del mismo y de sus prórrogas, si las hubiere, y tres (3) meses más; Calidad del Servicio, en cuantía equivalente al 20% del valor del CONTRATO con vigencia de seis (6) meses más terminado el plazo del mismo; y Póliza de garantía de salarios y prestaciones sociales e indemnizaciones del personal empleado por EL CONTRATISTA para la ejecución del presente contrato, por un valor asegurado equivalente al 25% del valor del contrato, con vigencia igual a la del presente contrato y treinta y seis (36) meses más."
  ),

  h("SÉPTIMA: PLAZO DE EJECUCIÓN"),
  p([
    "El término de ejecución del presente contrato será del ",
    tag("plazo_inicio_texto"),
    " al ",
    tag("plazo_fin_texto"),
    ".",
  ]),
  p(
    "PARÁGRAFO: No obstante a que los días de producción del evento sean los anteriormente definidos, EL CONTRATISTA prestará asesoría y acompañamiento durante los días previos y desde la firma del presente contrato en los tiempos y horarios definidos y acordados entre LAS PARTES."
  ),

  h("OCTAVA: DERECHOS DEL CONTRATISTA"),
  p(
    "Recibir el pago correspondiente en los términos pactados en el presente Contrato; recibir toda la información necesaria y adecuada para el cabal cumplimiento del presente contrato; y solicitar en cualquier etapa del proceso y antes de la firma de cualquier documento, aclaraciones, rectificaciones, correcciones o modificaciones sobre cualquier aspecto relacionado con el presente contrato, las cuales, en caso de efectuarse, deberán constar por escrito."
  ),

  h("NOVENA: DERECHOS DEL CONTRATANTE"),
  p(
    "Solicitar en cualquier momento al CONTRATISTA, de manera verbal y/o escrita, información referente al desarrollo del objeto del contrato y a sus avances; y realizar aclaraciones, verificaciones, sugerencias y demás al CONTRATISTA, siempre y cuando las mismas no afecten de manera sustancial la labor ejecutada, modifiquen aspectos propios del contrato o afecten de manera significativa el desarrollo del mismo."
  ),

  h("DÉCIMA: RESPONSABILIDAD E INDEMNIDAD"),
  p(
    "EL CONTRATISTA es responsable por el cumplimiento del objeto del contrato dentro de las fechas establecidas y con los requerimientos y licencias debidamente acreditadas, para la utilización antes, durante y después del evento. En igual sentido, EL CONTRATANTE es responsable en caso de incumplimiento de sus obligaciones para con el CONTRATISTA en el desarrollo y ejecución del presente contrato."
  ),
  p(
    "NINGUNA DE LAS PARTES será responsable frente a la otra o frente a terceros por daños especiales, imprevisibles o daños indirectos, derivados de fuerza mayor, caso fortuito o circunstancias especiales atribuibles a terceros y ajenas a la labor principal de cada una de las partes en el desarrollo del objeto del presente contrato. Se incluyen dentro de esta la caída repentina de internet sobre la que viaja la información del evento, la caída del flujo eléctrico o la pérdida de la señal de internet momentánea o permanente que afecte el registro o control de acceso de los asistentes al EVENTO."
  ),
  p(
    "PARÁGRAFO: No obstante lo anterior, EL CONTRATISTA podrá reaccionar con su infraestructura y experiencia para implementar escenarios alternativos de respuesta para que la afectación sea lo menos posible, pero en ningún caso será su responsabilidad, y podrá acordar con EL CONTRATANTE el pago de valores adicionales al valor del presente contrato en caso de que la solución a la contingencia lo amerite."
  ),
  p(
    "EL CONTRATANTE es el único dueño/propietario y responsable de EL EVENTO; en caso de que EL EVENTO se suspenda, aplace, cancele o no se realice por alguna causa justificada o injustificada, EL CONTRATANTE será el responsable de responder por la devolución de dineros con la colaboración y/o participación de EL CONTRATISTA, en los términos que sobre el particular las partes acuerden."
  ),
  p(
    "EN NINGÚN CASO de cancelación, suspensión, aplazamiento, caso fortuito o causa justificada o injustificada que impida la realización y ejecución total o parcial del EVENTO procederá el no pago de los conceptos del presente contrato (por los servicios de la plataforma y por los servicios de venta de boletería); siempre se debe cancelar por parte de EL CONTRATANTE la parte proporcional o total, según corresponda, a la prestación de los servicios de la plataforma TICKETCODE."
  ),
  p(
    "EL CONTRATISTA debe comprometer con anticipación todos y cada uno de los recursos dispuestos para la operación física con el objetivo de cumplir con el objeto del presente contrato; por tal motivo no es responsable por la cancelación del evento que realice EL CONTRATANTE, y en ninguno de los casos procede el no pago total por parte del CONTRATANTE del valor del presente contrato."
  ),
  p(
    "EL CONTRATANTE mantendrá indemne a EL CONTRATISTA de cualquier reclamación por circunstancias, fallas e imprevistos que puedan presentarse, que no sean de responsabilidad de EL CONTRATISTA y que sean atribuibles a terceros en el desarrollo del objeto del presente contrato. De igual manera, EL CONTRATISTA mantendrá indemne al CONTRATANTE por circunstancias que puedan presentarse y que no sean responsabilidad del CONTRATANTE."
  ),

  h("DÉCIMA PRIMERA: TERMINACIÓN"),
  p(
    "El presente contrato podrá darse por terminado por mutuo acuerdo entre las partes, o en forma unilateral por el incumplimiento de las obligaciones derivadas del contrato, por cualquiera de ellas. POR MUTUO ACUERDO: las partes podrán dar por terminado este contrato en cualquier tiempo. DE PLENO DERECHO: las partes podrán dar por terminado el contrato en cualquier momento y sin previo aviso, cuando una de las partes haya incurrido en el incumplimiento de cualquiera de las obligaciones pactadas, sin que medie caso fortuito o fuerza mayor. POR JUSTA CAUSA: sin generar indemnización, por violación del derecho de reserva sobre la información, o por el incumplimiento de cualquiera de los compromisos económicos que conllevan para las partes el presente contrato. POR EFECTOS LEGALES: en caso de vulneración a las disposiciones legales que rigen el presente contrato, que hagan imposible para las partes continuar con su ejecución, sin lugar a indemnización. POR SENTENCIA que así lo ordene."
  ),
  p(
    "La cesión o cualquier acto unilateral de disposición de alguna de las partes sobre el contrato constituye causal de terminación unilateral del contrato con indemnización por la suma de diez (10) salarios mínimos legales vigentes mensuales en favor de la parte afectada."
  ),

  h("DÉCIMA SEGUNDA: EXCLUSIÓN DE LA RELACIÓN LABORAL"),
  p(
    "LAS PARTES manifiestan que con la suscripción del presente contrato no se constituye vínculo laboral alguno entre EL CONTRATANTE y los empleados o dependientes que EL CONTRATISTA ocupe para el cumplimiento del objeto contractual. EL CONTRATISTA dispone de autonomía y libertad técnica, administrativa y directiva para la ejecución del presente contrato y será el único responsable por la vinculación del personal que requiera, la cual realizará en su propio nombre, por su cuenta y riesgo, sin que EL CONTRATANTE adquiera responsabilidad alguna por tales actos o contratos, ni por las obligaciones derivadas de la calidad de empleador que la Ley Laboral establece."
  ),

  h("DÉCIMA TERCERA: CLÁUSULA PENAL"),
  p(
    "En caso de incumplimiento total o parcial de las obligaciones del presente contrato por cualquiera de las partes, que no sea subsanado en un plazo de dos (2) días hábiles contados a partir de la fecha de incumplimiento, la parte que incumpla deberá pagar a la parte afectada, a título de indemnización, una suma equivalente al VEINTE POR CIENTO (20%) del valor total del contrato."
  ),
  p(
    "El valor pactado de la presente cláusula penal es el de la estimación anticipada de perjuicios. En armonía con lo dispuesto por los artículos 1602 y 1546 del Código Civil, en los contratos bilaterales, si uno de los contratantes no cumple lo pactado, opera la condición resolutoria y, en tal caso, por ministerio de la ley se faculta al otro contratante para pedir a su arbitrio el cumplimiento del contrato o su resolución, en ambos casos con la indemnización de perjuicios correspondiente."
  ),

  h("DÉCIMA CUARTA: PROPIEDAD INTELECTUAL E INDUSTRIAL"),
  p(
    "Los derechos de propiedad sobre las marcas, nombres, logos y emblemas tanto del CONTRATANTE como del CONTRATISTA son de propiedad exclusiva de cada una de ellas. Ninguna de las partes podrá utilizar la marca, el nombre, el logo o el emblema de la otra sin autorización previa, y su utilización no constituirá en ningún sentido derechos de propiedad intelectual sobre los mismos."
  ),

  h("DÉCIMA QUINTA: CONFIDENCIALIDAD Y MANEJO DE LA INFORMACIÓN"),
  p(
    "Las partes, sus empleados y/o personal se abstendrán de divulgar, publicar, comunicar directa o indirectamente a terceros, o utilizar para propósitos diferentes a la correcta ejecución de este contrato, la información relacionada con la ejecución del mismo. Toda información a la que tengan acceso o reciban en virtud del presente contrato se considera confidencial; divulgar o transmitir dicha información dará derecho a la parte cumplida a ejercer las acciones legales correspondientes. La obligación de confidencialidad subsistirá aún después de la terminación del presente contrato."
  ),

  h("DÉCIMA SEXTA: PRÓRROGA"),
  p(
    "Si vencido el plazo establecido para la ejecución del contrato de prestación de servicios el CONTRATANTE decide ampliar el plazo de vencimiento, se elaborará un otrosí en tal sentido, el cual hará parte integral de este contrato."
  ),

  h("DÉCIMA SÉPTIMA: CESIONES"),
  p(
    "NINGUNA DE LAS PARTES puede ceder parcial ni totalmente sus obligaciones o derechos derivados del presente contrato sin la autorización previa, expresa y escrita de la otra parte."
  ),

  h("DÉCIMA OCTAVA: NUEVO SERVICIO"),
  p(
    "Si finalizado el objeto del servicio contratado, el CONTRATANTE necesita un nuevo servicio del CONTRATISTA, se deberá hacer un nuevo Contrato de Prestación de Servicios, y no se entenderá como prórroga por desaparecer las causas contractuales que dieron origen al presente contrato."
  ),

  h("DÉCIMA NOVENA: SOLUCIÓN DE CONTROVERSIAS"),
  p(
    "Las controversias o diferencias que surjan entre el CONTRATISTA y el CONTRATANTE con ocasión de la firma, ejecución, interpretación, prórroga o terminación del contrato, así como de cualquier otro asunto relacionado con el mismo, se intentarán solucionar en primera instancia mediante arreglo directo, en un término no mayor a cinco (5) días hábiles a partir de la fecha en que cualquiera de las partes comunique por escrito a la otra la existencia de una diferencia."
  ),
  p(
    "Cuando la controversia no pueda solucionarse de manera directa luego de un periodo de treinta (30) días hábiles, el asunto debe someterse a un procedimiento conciliatorio ante un Centro de Conciliación debidamente autorizado. Si en el término de ocho (8) días hábiles a partir del inicio del trámite de conciliación las partes no llegan a un acuerdo, deberán acudir como última y definitiva instancia a la jurisdicción ordinaria. En todo caso, este contrato presta mérito ejecutivo por ser una obligación clara, expresa y exigible para las partes."
  ),

  h("VIGÉSIMA: ANEXOS DEL CONTRATO"),
  p(
    "Hacen parte integral de este contrato los siguientes documentos: certificados de existencia y representación legal de cada una de las partes; propuesta comercial aprobada; y demás documentación relacionada que pueda surgir del objeto contractual."
  ),

  h("VIGÉSIMA PRIMERA: LEGISLACIÓN APLICABLE"),
  p(
    "El presente contrato se rige por las leyes de la República de Colombia, en especial por las normas de derecho privado aplicables, es decir, el Código Civil y Código de Comercio y las demás disposiciones aplicables al caso en concreto."
  ),

  h("VIGÉSIMA SEGUNDA: VALIDEZ Y PERFECCIONAMIENTO"),
  p("El presente contrato tendrá plena validez con la firma autógrafa de cada una de las partes."),

  h("VIGÉSIMA TERCERA: DOMICILIO CONTRACTUAL"),
  p([
    "El domicilio contractual es para todos los efectos legales la ciudad de ",
    tag("ciudad_firma"),
    `. Las notificaciones serán recibidas por las partes en las siguientes direcciones: EL CONTRATANTE en `,
    tag("contratante_direccion"),
    ` y EL CONTRATISTA, en la ${CONTRATISTA.direccion}.`,
  ]),

  p([
    "En prueba de conformidad se firman dos ejemplares de un mismo tenor, en la ciudad de ",
    tag("ciudad_firma"),
    " a los ",
    tag("fecha_firma_texto"),
    ".",
  ], { spacing: { before: 300, after: 400 } }),
];

const firmas = [
  p("_________________________________________"),
  p([boldTag("contratante_representante_legal")]),
  p(["C.C. N° ", tag("contratante_cedula"), " expedida en ", tag("contratante_cedula_ciudad")]),
  p("Representante Legal"),
  p([boldTag("contratante_empresa")]),
  p(["NIT: ", tag("contratante_nit")]),
  p("CONTRATANTE", { spacing: { after: 400 } }),

  p("____________________________________"),
  p(CONTRATISTA.nombre),
  p(`C.C. No. ${CONTRATISTA.cedula}`),
  p("Representante Legal"),
  p(CONTRATISTA.empresa),
  p(`NIT: ${CONTRATISTA.nit}`),
  p("CONTRATISTA"),
];

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [title, subtitle, intro, ...considerandos, ...clausulas, ...firmas],
    },
  ],
});

const outDir = path.resolve(process.cwd(), "templates");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "contrato-template.docx");
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log(`Plantilla generada: ${outPath} (${buffer.length} bytes)`);
