-- Los servicios de streaming (virtual + híbrido) y de mundo virtual son
-- personalizados (precio manual por evento) — no deben vivir en
-- "Componentes básicos" (gratis) sino en "Servicios personalizados", y
-- diferenciados de los servicios de modalidad presencial/general por su
-- propio `modality`, para que solo aparezcan y sumen al presupuesto cuando
-- la propuesta es de esa modalidad (ver lib/data/service-items.ts).
--
-- No se tocan ni se borran las filas existentes de "Componentes básicos"
-- con estos mismos nombres (quedan sin uso para propuestas nuevas, pero no
-- se altera nada de lo ya guardado en propuestas reales).

-- Streaming — aplica a Virtual e Híbrido (cada modalidad necesita su propia
-- fila porque `modality` no es un arreglo).
do $$
declare
  m text;
  streaming_items jsonb := '[
    {"name": "Visita Pre-producción (master en sitio)", "description": "Incluye: Revisión de todos los componentes del plan logístico (Flujo de ingreso, Prueba de Internet, revisión de conexiones eléctricas, sesiones internas, centro de operaciones)", "sort_order": 100},
    {"name": "Preproducción remota", "description": "Incluye: asesoria en buenas prácticas, validación de componentes de la transmisión (agenda, status speakers, piezas de diseño de la transmisión)", "sort_order": 101},
    {"name": "Landing de transmisión", "description": "Incluye: Interface optimizada (hosting, infraestructura, componentes de seguridad) para la transmisión del contenido", "sort_order": 102},
    {"name": "Canal dedicado Streaming", "description": "Incluye: Hosting e infraestructura para soportar el aforo esperado", "sort_order": 103},
    {"name": "Salas de streaming simultáneas", "description": "Incluye: Configuración de (x) salas simultáneas, habilitación de utilidades (chat, salas privadas, v-card)", "sort_order": 104},
    {"name": "Master de transmisión", "description": "Incluye: Capturadora, switch, canal, servidores, portatil, () camaras, () micrófonos", "sort_order": 105},
    {"name": "Asesoria pre-producción", "description": "Incluye: entrega de formatos para minutograma, formato de piezas standar para la transmisión (cortinillas, tituladores, aperturas, cierres, overlays)", "sort_order": 106},
    {"name": "Suministro de personal soporte audiovisual", "description": "Incluye: () Productores, (x) asistentes de cámaras, (x) asistente emisión y sonido", "sort_order": 107},
    {"name": "Cámaras", "description": "Incluye: suministro de (x) cámaras profesionales", "sort_order": 108},
    {"name": "Sonido", "description": "Incluye: consola de sonido, (x) microfonos", "sort_order": 109},
    {"name": "Soporte técnico (streaming)", "description": "Incluye: mesa de ayuda remota, atención y solución a problemas técnicos, respaldo de operaciones", "sort_order": 110},
    {"name": "Entrega de material / grabaciones", "description": "Incluye: Material completo o cortado en formato h.264 (calidad streaming)", "sort_order": 111},
    {"name": "Informes (streaming)", "description": "Incluye: Informe detallado de asistentes a nivel general, por sala, por franja", "sort_order": 112}
  ]'::jsonb;
  item jsonb;
begin
  foreach m in array array['virtual', 'hibrido'] loop
    for item in select * from jsonb_array_elements(streaming_items) loop
      insert into catalog_items (modality, category, name, description, unit, has_price, default_included, sort_order)
      values (
        m,
        'servicio_personalizado',
        item->>'name',
        item->>'description',
        'por_unidad',
        true,
        false,
        (item->>'sort_order')::integer
      );
    end loop;
  end loop;
end $$;

-- Mundo Virtual — solo aplica a esa modalidad.
insert into catalog_items (modality, category, name, description, unit, has_price, default_included, sort_order) values
  ('mundo_virtual', 'servicio_personalizado', 'Alcance Global de espacios y aforo esperado', E'Incluye: 2 mundos virtuales paralelos (Premium y básico)\nPremium: Contiene 1 Lobby, un auditorio y muestra comercial de hasta 10 stands\nBásico: Contiene 1 Lobby, auditorio + transición para pago y acceso a Premium\nAforo esperado/recurrencia: 30.000 a 35.000 personas por día', 'por_unidad', true, false, 200),
  ('mundo_virtual', 'servicio_personalizado', 'Construcción mundo virtual', 'Incluye: 2 propuestas de línea arquitectónica, modelado y diseño 3D, renderizaciónes, producción final (máxima calidad)', 'por_unidad', true, false, 201),
  ('mundo_virtual', 'servicio_personalizado', 'Experiencia de Usuario', 'Incluye: Diseño de interfaz UX, Diseño de navegabilidad e interactividad', 'por_unidad', true, false, 202),
  ('mundo_virtual', 'servicio_personalizado', 'Interactividad / Networking', 'Incluye: 1 sala global de chat, 7 salas temáticas de chat, tarjetas virtuales de negocios', 'por_unidad', true, false, 203),
  ('mundo_virtual', 'servicio_personalizado', 'Desarrollos, implementaciones y personalizaciones', 'Incluye: Menú de navegación, mapa de navegación, múltiples espacios de branding del organizador y/o aliados o patrocinadores, muestra comercial con chat y video llamada para asesores comerciales, métricas de ingreso y participación para cada espacio', 'por_unidad', true, false, 204),
  ('mundo_virtual', 'servicio_personalizado', 'Infraestructura (Cloud server)', 'Incluye: Alojamiento de AssetBundle para backgrounds, imagenes y gifs, creación de entornos y repositorios para pruebas y producción, Cloudserver para Backend webVR', 'por_unidad', true, false, 205),
  ('mundo_virtual', 'servicio_personalizado', 'Landing de transmisión (mundo virtual)', 'Incluye: Interfaz robusta, elástica y optimizada para el tráfico durante los días de la transmisión, internet de la transmisión acoplada, protocolos de seguridad y privacidad', 'por_unidad', true, false, 206),
  ('mundo_virtual', 'servicio_personalizado', 'Tiempo de producción y entrega', '30 días hábiles, incluye (propuestas, ajustes, pre-renders, renders, versión producción (máxima calidad)', 'por_unidad', true, false, 207),
  ('mundo_virtual', 'servicio_personalizado', 'Material', 'El organizador debe suministrar: Imágenes, logos, videos, textos, documentos, propios y/o de sus aliados según corresponda para los espacios de los mundos virtuales', 'por_unidad', true, false, 208),
  ('mundo_virtual', 'servicio_personalizado', 'Notas y no incluidos', E'- Todo el contenido de la transmisión debe ser entregado listo y marcado (con tituladores, créditos, cortinillas...etc)\n- Podemos realizar la retransmisión a redes sociales con la autorización y permisos en los canales (Facebook, Youtube)\n- La propuesta no incluye: Diseño de piezas del streaming, pre-producción, producción, postproducción audiovisual', 'por_unidad', true, false, 209);
