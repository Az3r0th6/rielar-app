// Configuración centralizada de monetización, donaciones y enlaces de afiliados
// Podés editar estos valores en cualquier momento con tus propios usuarios y links reales.

export const MONETIZATION_CONFIG = {
  // Configuración de Cafecito & Donaciones
  donations: {
    // Tu enlace de Cafecito (ej: 'https://cafecito.app/tu_usuario')
    cafecitoUrl: 'https://cafecito.app/rielar',

    // Alias o CVU de Mercado Pago para transferencias directas en pesos
    mercadoPago: {
      alias: 'martincalvoruiz.mp',
      holder: 'Martin Calvo Ruiz',
      entity: 'Mercado Pago',
      cuit: '', // Opcional
    },

    // Montos sugeridos en pesos argentinos para mostrar
    tiers: [
      { amount: 1000, label: '1 Café', icon: '☕' },
      { amount: 2000, label: '2 Cafés', icon: '☕☕' },
      { amount: 5000, label: 'Súper Aporte', icon: '🚀' },
    ],

    // Mensaje de transparencia
    benefitsText: [
      'Mantenimiento de servidores en la nube activos 24/7',
      'Desarrollo continuo de mejoras y soporte de nuevas líneas',
      'Experiencia limpia, rápida y 100% sin publicidad invasiva',
    ],
  },

  // Enlaces de afiliados y alternativas de transporte ante demoras / cancelaciones
  affiliates: {
    cabify: {
      name: 'Cabify',
      tagline: 'Tarifa fija y segura',
      actionText: 'Pedir auto en Cabify',
      url: 'https://cabify.com/download',
      promoCode: '', // Cargá tu código de invitación personal cuando quieras
      brandColor: '#7152f8',
      textColor: '#ffffff',
    },
    uber: {
      name: 'Uber',
      tagline: 'Llega en pocos minutos',
      actionText: 'Pedir viaje en Uber',
      url: 'https://m.uber.com/ul/?action=setPickup',
      promoCode: '', // Cargá tu código de invitación personal cuando quieras
      brandColor: '#1a1a1a',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    didi: {
      name: 'DiDi',
      tagline: 'Tarifas accesibles',
      actionText: 'Pedir viaje en DiDi',
      url: 'https://argentina.didiglobal.com/',
      promoCode: '', // Cargá tu código de invitación personal cuando quieras
      brandColor: '#ff7700',
      textColor: '#ffffff',
    },
  },
};
