from .steps_config import INDEED_STEPS

def fetch_jobs():
    # TODO: Implement fetching jobs from Indeed
    pass

def parse_results():
    # TODO: Implement parsing job results
    pass

def filter_jobs():
    # TODO: Implement job filtering logic
    pass

def apply_to_jobs():
    # TODO: Implement job application logic
    pass

def log_applications():
    # TODO: Implement logging of applications
    pass

STEP_FUNCTIONS = {
    "fetch_jobs": fetch_jobs,
    "parse_results": parse_results,
    "filter_jobs": filter_jobs,
    "apply_to_jobs": apply_to_jobs,
    "log_applications": log_applications,
}
