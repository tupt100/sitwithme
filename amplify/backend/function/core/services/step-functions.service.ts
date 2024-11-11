import StepFunctions from 'aws-sdk/clients/stepfunctions';

export class StepFunctionsService {
  stepfunctions: StepFunctions;

  constructor() {
    this.stepfunctions = new StepFunctions({ apiVersion: '2016-11-23' });
  }

  async startExecution(params: StepFunctions.StartExecutionInput): Promise<StepFunctions.StartExecutionOutput> {
    return this.stepfunctions.startExecution(params).promise();
  }

  async stopExecution(params: StepFunctions.StopExecutionInput): Promise<StepFunctions.StopExecutionOutput> {
    return this.stepfunctions.stopExecution(params).promise();
  }
}
