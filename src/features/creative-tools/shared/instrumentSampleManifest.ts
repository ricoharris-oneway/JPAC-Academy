export type SamplePreparationStatus = 'requires-pitch-identification' | 'requires-motif-review';

export type PreparedInstrumentSample = {
  id: string;
  instrument: 'piano' | 'guitar';
  intendedUse: 'note' | 'motif';
  proposedPath: string;
  proposedRootNote?: string;
  enabled: false;
  status: SamplePreparationStatus;
};

const proposedPianoNotes = ['C2', 'F2', 'C3', 'F3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'C7'] as const;

export const proposedPianoSamples: readonly PreparedInstrumentSample[] = proposedPianoNotes.map((note) => ({
  id: `piano-${note.toLowerCase()}`,
  instrument: 'piano',
  intendedUse: 'note',
  proposedPath: `/audio/instruments/piano/piano-${note}.ogg`,
  proposedRootNote: note,
  enabled: false,
  status: 'requires-pitch-identification',
}));

export const proposedGuitarMotifs: readonly PreparedInstrumentSample[] = Array.from({ length: 6 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `guitar-motif-${number}`,
    instrument: 'guitar',
    intendedUse: 'motif',
    proposedPath: `/audio/instruments/guitar/guitar-motif-${number}.ogg`,
    enabled: false,
    status: 'requires-motif-review',
  };
});

export const instrumentSampleManifest = {
  version: 1,
  readyForPlayback: false,
  piano: proposedPianoSamples,
  guitarMotifs: proposedGuitarMotifs,
} as const;
