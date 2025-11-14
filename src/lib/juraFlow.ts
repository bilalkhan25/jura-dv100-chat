export type FlowStep = {
  page: number;
  id: string;
  type: string;
  context?: string;
  required?: boolean;
  auto?: boolean;
};

export async function loadFlow(): Promise<FlowStep[]> {
  const module = await import('../../flows/juraDv100Flow.json');
  const { steps } = module.default as { steps: FlowStep[] };
  return steps;
}
