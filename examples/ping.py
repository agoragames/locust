from locust import HttpLocust, TaskSet, task

class PingTasks(TaskSet):

    @task
    def ping(self):
        self.client.get("/accounts/ping")

class PingUser(HttpLocust):
    """
    Ping things
    """
    host = "http://127.0.0.1:9090"
    task_set = PingTasks
