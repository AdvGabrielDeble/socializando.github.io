import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWorkshopSessions, buildWorkshopCardModel, getModuleState } from './public.js';

const sessions = [
  {
    id: 'j1', experienceKey: 'expedicao-jurassica', slug: 'expedicao-jurassica-2026-10-10', title: 'Expedição Jurássica',
    shortDescription: 'Monte, explore e crie seu dinossauro!', eventDate: '2026-10-10', startTime: '14:00:00', endTime: '15:30:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'jurassica.jpeg', availableSpots: 8,
  },
  {
    id: 'j2', experienceKey: 'expedicao-jurassica', slug: 'expedicao-jurassica-2026-10-17', title: 'Expedição Jurássica',
    shortDescription: 'Monte, explore e crie seu dinossauro!', eventDate: '2026-10-17', startTime: '14:00:00', endTime: '15:30:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'jurassica.jpeg', availableSpots: 15,
  },
  {
    id: 's1', experienceKey: 'fabrica-dos-squishs-magicos', slug: 'fabrica-dos-squishs-magicos-2026-10-10', title: 'Fábrica dos Squishs Mágicos',
    shortDescription: 'Oficina de Paper Squish especial do Dia das Crianças.', eventDate: '2026-10-10', startTime: '15:30:00', endTime: '17:00:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'squish.jpeg', availableSpots: 1,
  },
];

test('groupWorkshopSessions groups a second turma by experience without duplicating experience', () => {
  const grouped = groupWorkshopSessions(sessions);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].sessions.length, 2);
  assert.deepEqual(grouped[0].sessions.map(s => s.id), ['j1', 'j2']);
});

test('buildWorkshopCardModel exposes exact price age and availability labels', () => {
  const card = buildWorkshopCardModel(groupWorkshopSessions(sessions)[1]);
  assert.equal(card.priceLabel, 'R$ 50,00');
  assert.equal(card.ageLabel, 'A partir de 5 anos');
  assert.equal(card.sessions[0].availabilityLabel, 'Última vaga');
  assert.equal(card.sessions[0].canRegister, true);
});

test('sold out session disables registration', () => {
  const sold = { ...sessions[0], availableSpots: 0 };
  const card = buildWorkshopCardModel(groupWorkshopSessions([sold])[0]);
  assert.equal(card.sessions[0].availabilityLabel, 'Esgotada');
  assert.equal(card.sessions[0].canRegister, false);
});

test('module state is explicit when backend is unavailable', () => {
  assert.deepEqual(getModuleState({ loading: false, error: new Error('offline'), groups: [] }), {
    kind: 'unavailable', message: 'Inscrições online temporariamente indisponíveis.'
  });
});

test('empty successful list is not confused with backend failure', () => {
  assert.deepEqual(getModuleState({ loading: false, error: null, groups: [] }), {
    kind: 'empty', message: 'Nenhuma oficina com inscrições abertas neste momento.'
  });
});
