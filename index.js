'use strict';

/**
 * Triggered from Cloud Scheduler
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.runHandler = async (event, context, callback) => {
    try
    {
        // Get and parse payload
        const payload = JSON.parse(Buffer.from(event.data, 'base64').toString()); 
        const vms = payload.instances;
        
        let message = '';
        if (payload.command == "start")
        {
            await Promise.all(vms.map(async instance => {
                // TODO start script execution
                const [operation] = await getComputeVM(instance.name, instance.zone).start();
                
                // Operation pending
                console.log(`Starting VM: ${instance.name}`);
                message = 'Successfully started instance(s)';
                return operation.promise();
            }));
        }
        else if (payload.command == "stop")
        {
            await Promise.all(vms.map(async instance => {
                // TODO stop script execution
                const [operation] = await getComputeVM(instance.name, instance.zone).stop();
                
                // Operation pending
                console.log(`Stopping VM: ${instance.name}`);
                message = 'Successfully stopped instance(s)';
                return operation.promise();
            }));
        } 
        else 
        {
            console.warn("Wrong instruction: " + payload.command);
            return;
        }

        
        console.log(message);
        callback(null, message);
    
    }
    catch (err)
    {
        console.log(err);
        callback(err);
    }
};

function getComputeVM(name, zone)
{
    const Compute = require('@google-cloud/compute');
    const compute = new Compute();
    return compute.zone(zone).vm(name)
}
