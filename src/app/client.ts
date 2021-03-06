import { v4 } from 'uuid';
import { CeleryConf, DEFAULT_CELERY_CONF } from './conf';
import Base from './base';
import Task from './task';
import { AsyncResult } from './result';

/**
 * create json string representing celery task message. used by Client.publish
 * now supports only protocol v1.
 *
 * celery protocol reference: https://docs.celeryproject.org/en/latest/internals/protocol.html
 * celery code: https://github.com/celery/celery/blob/4aefccf8a89bffe9dac9a72f2601db1fa8474f5d/celery/app/amqp.py#L307-L464
 *
 * @function createTaskMessage
 * @param {String} id for task id. commonly it is uuid.v4()
 * @param {String} taskName for task name dispatched by worker
 * @param {Array} args for function parameter
 * @param {object} kwargs for function named parameter
 *
 * @returns {String} JSON serialized string of celery task message
 */
export function createTaskMessage(
  id: string, 
  taskName: string, 
  args?: Array<any>, 
  kwargs?: object
): string {
  const message = {
    id,
    task: taskName,
    args: args || [],
    kwargs: kwargs || {},
  };

  return JSON.stringify(message);
}

export default class Client extends Base {
  /**
   * Celery client
   * @extends {external:Base}
   * @constructor Client
   * @param {CeleryConf} conf configuration object of Celery Client. For more information, see Base#constructor.
   */
  // eslint-disable-next-line no-useless-constructor
  constructor(conf: CeleryConf = DEFAULT_CELERY_CONF) {
    super(conf);
  }

  /**
   * createTask
   * @method Client#createTask
   * @param {string} name for task name
   * @returns {Task} task object
   * 
   * @example
   * client.createTask('task.add').delay([1, 2])
   */
  public createTask(name: string): Task {
    return new Task(this, name);
  }

  /**
   * delay
   * @method Client#delay
   * @param {String} name the task name for create new delayed task
   * @param {Array} args array for arguments of the delayed task
   * @param {object} kwargs object for named arguments of the delayed task
   * @returns {AsyncResult} async result object for get result of delayed task
   *
   * @example
   * client.delay('tasks.add', [1, 2])
   */
  public delay(
    name: string, 
    args: Array<any>, 
    kwargs?: object
  ): AsyncResult {
    const result = this.createTask(name).delay(args, kwargs);

    return result;
  }

  /**
   * publish
   * @method Client#publish
   * @param {Task} task
   * @param {Array} args
   * @param {object} kwargs
   * @returns {AsyncResult} async result object for get result of delayed task
   */
  public publish(
    task: Task, 
    args: Array<any>, 
    kwargs: object
  ): AsyncResult {
    const taskId = v4();
    const result = new AsyncResult(taskId, this.backend);

    const message = createTaskMessage(taskId, task.name, args, kwargs);

    this.isReady()
      .then(() => this.broker.publish('celery', message));

    return result;
  }
}
