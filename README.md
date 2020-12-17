# Creestop
Google Cloud Function allowing to start and stop many instances at a time.

The code of this function allows **to start and stop one or more existing GCE VMs** at a time. The function is intended to consume instructions through Pub/Sub messages, the message format being the following:

```python
variable "command" {
  type = object({
    command = string
    instances = list(object({
      name = string
      zone = string
    }))
  })
}
```

Thus, "**command**" can take (for now) only these two values:
- **start**: sends **start** order to instances.
- **stop**: envía la orden de **stop** order to instances.

**Example**

```json
{
  "command": "start",
  "instances": [
    {
      "name": "ci-tableau-1", 
      "zone": "europe-west3-a"
    }, 
    {
      "name": "ci-tableau-2", 
      "zone": "europe-west3-b"
    },
    {
      "name": "ci-tableau-3", 
      "zone": "europe-west3-c"
    }
  ]
}
```

## Deployment

You can easily deploy this function using either gcloud or Terraform or whatever you want. I provide an example using gcloud.

```bash
gcloud beta functions deploy <function-name> \
  --project=<project> \
  --region=<region> \
  --source=https://source.developers.google.com/projects/<project>/repos/<repo-name> \
  --runtime=nodejs10 \
  --trigger-topic=<topic-name> \
  --memory=128 \
  --service-account=<service-account-email> \
  --ingress-settings=<all, internal-only> \
  --timeout=<timeout in seconds, i.e. 120s> \
  --entry-point=<function handler>
```

## Examples

Deploy with Terraform two Cloud Scheduler jobs to programmatically start and stop instances. The following instances will be used:

|Instance name|Zone|
|----|----|
|ci-tableau-1|europe-west3-a| 
|ci-tableau-2|europe-west3-b| 
|ci-tableau-3|europe-west3-c| 
<br/>

By using *locals* in Terraform, we simplify command construction.

```python
locals {
  start_command = {
    command = "start",
    instances = local.instances
  }
  stop_command = {
    command = "stop",
    instances = local.instances
  }
  instances = [
    {
      name: "ci-tableau-1",
      zone: "europe-west3-a"
    },
    {
      name: "ci-tableau-2",
      zone: "europe-west3-b"
    },
    {
      name: "ci-tableau-3",
      zone: "europe-west3-c"
    }
  ]
}
```

Create a Cloud Scheduler job "start_job":

```python
resource "google_cloud_scheduler_job" "start_job" {
  name        = "cron-start-1"
  description = "Start Tableau"
  schedule    = "0 9 * * mon-fri"
  region      = "europe-west1" # In my tests it only allowed me to enable AppEngine in Europe West 1.

  pubsub_target {
    topic_name = google_pubsub_topic.topic.id # The topic to publish the message.
    data       = base64encode(jsonencode(local.start_command)) # The CF "eats" JSON.
  }

  depends_on = [google_app_engine_application.default]
}
```

Y otro para la parada:

```python
resource "google_cloud_scheduler_job" "stop_job" {
  name        = "cron-stop-1"
  description = "Stop Tableau"
  schedule    = "0 19 * * mon-fri"
  region      = "europe-west1"

  pubsub_target {
    topic_name = google_pubsub_topic.topic.id
    data       = base64encode(jsonencode(local.stop_command))
  }

  depends_on = [google_app_engine_application.default]
}
```

## TODO

- Allow custom startup script (GCS location).
- Allow custom stop script (GCS location).
