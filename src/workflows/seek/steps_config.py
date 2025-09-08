from __future__ import annotations
from .steps_impl import (
	step0, open_homepage, refresh_page, wait_for_page_load, detect_page_state, show_sign_in_banner, collect_job_cards, click_job_card, 
	wait_for_details_panel, extract_job_details_raw, detect_quick_apply, parse_job_details, 
	click_quick_apply, wait_for_quick_apply_page, handle_resume_selection, handle_cover_letter,
	click_continue_button, handle_answer_employer_questions, submit_application, finish_run, 
    get_current_step, back_button_quickapply, generic_forms_lions,
	handle_update_seek_profile, handle_answer_employer_questions, close_quick_apply_and_continue_search
)

WORKFLOW_META = {
	"title": "Seek",
	"description": "Search and apply on seek.com.au Jobs",
	"start_step": "init_context",
}

STEPS_CONFIG = {
	"init_context": {
		"step": 0,
		"func": step0,
		"transitions": {"ctx_ready": "open_homepage"},
		"timeout": 30,
		"on_timeout_event": "ctx_ready",
	},
	"open_homepage": {
		"step": 1,
		"func": open_homepage,
		"transitions": {
			"homepage_opened": "wait_for_load", 
			"no_browser_context": "init_context",
			"page_navigation_failed": "init_context"
		},
		"timeout": 20,
		"on_timeout_event": "page_navigation_failed",
	},
	"refresh_page": {
		"step": 1.5,
		"func": refresh_page,
		"transitions": {
			"page_refreshed": "wait_for_load", 
			"no_page_to_refresh": "init_context",
			"page_reload_failed": "init_context"
		},
		"timeout": 20,
		"on_timeout_event": "page_reload_failed",
	},
	"wait_for_load": {
		"step": 2,
		"func": wait_for_page_load,
		"transitions": {"page_loaded": "detect_page_state", "page_load_retry": "refresh_page"},
		"timeout": 20,
		"on_timeout_event": "page_load_retry",
	},
	"detect_page_state": {
		"step": 3,
		"func": detect_page_state,
		"transitions": {"cards_present": "collect_job_cards", "sign_in_required": "show_sign_in_banner", "no_cards_found": "refresh_page"},
		"timeout": 20,
		"on_timeout_event": "no_cards_found",
	},
	"show_sign_in_banner": {
		"step": 4,
		"func": show_sign_in_banner,
		"transitions": {"signin_banner_shown": "done", "signin_banner_retry": "refresh_page"},
		"timeout": 20,
		"on_timeout_event": "signin_banner_retry",
	},
	"collect_job_cards": {
		"step": 5,
		"func": collect_job_cards,
		"transitions": {"cards_collected": "click_job_card", "cards_collect_retry": "refresh_page"},
		"timeout": 20,
		"on_timeout_event": "cards_collect_retry",
	},
	"click_job_card": {
		"step": 6,
		"func": click_job_card,
		"transitions": {"job_card_clicked": "wait_for_details_panel", "job_card_skipped": "collect_job_cards"},
		"timeout": 20,
		"on_timeout_event": "job_card_skipped",
	},
	"wait_for_details_panel": {
		"step": 7,
		"func": wait_for_details_panel,
		"transitions": {"details_panel_ready": "detect_quick_apply", "details_panel_retry": "refresh_page"},
		"timeout": 25,
		"on_timeout_event": "details_panel_retry",
	},
	"detect_quick_apply": {
		"step": 8,
		"func": detect_quick_apply,
		"transitions": {"quick_apply_found": "click_job_card", "regular_apply_found": "click_quick_apply", "apply_missing": "click_job_card"},
		"timeout": 20,
		"on_timeout_event": "regular_apply_found",
	},
    "generic_forms_lions": {
		"step": 8,
		"func": generic_forms_lions,
		"transitions": {"questions_found": "close_quick_apply_and_continue_search", "questions_not_found": "close_quick_apply_and_continue_search"},
		"timeout": 20,
		"on_timeout_event": "generic_forms_lions",
	},
	"click_quick_apply": {
		"step": 9,
		"func": click_quick_apply,
		"transitions": {
			"quick_apply_clicked": "wait_for_quick_apply_page", 
			"regular_apply_clicked": "generic_forms_lions",
			"missing_page_or_context": "finish_run",
			"no_apply_buttons_found": "finish_run",
			"new_tab_not_opened": "finish_run",
			"button_click_failed": "finish_run",
			"no_quick_apply_button_found": "finish_run",
			"no_regular_apply_button_found": "finish_run",
			"quick_apply_error": "finish_run"
		},
		"timeout": 20,
		"on_timeout_event": "quick_apply_error",
	},
	"wait_for_quick_apply_page": {
		"step": 10,
		"func": wait_for_quick_apply_page,
		"transitions": {
			"quick_apply_page_ready": "get_current_step", 
			"no_quick_apply_page": "finish_run",
			"page_load_timeout": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "page_load_timeout",
	},
	"handle_resume_selection": {
		"step": 11,
		"func": handle_resume_selection,
		"transitions": {
			"resume_selected": "handle_cover_letter", 
			"resume_not_required": "handle_cover_letter",
			"no_quick_apply_page": "finish_run",
			"no_resume_options_available": "finish_run",
			"resume_options_error": "finish_run",
			"resume_method_change_failed": "finish_run",
			"no_resume_available": "finish_run",
			"resume_selection_error": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "resume_selection_error",
	},
	"handle_cover_letter": {
		"step": 12,
		"func": handle_cover_letter,
		"transitions": {
			"cover_letter_filled": "click_continue_button",
			"cover_letter_not_required": "click_continue_button", 
			"no_quick_apply_page": "finish_run",
			"cover_letter_textarea_not_found": "click_continue_button",
			"cover_letter_error": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "cover_letter_error",
	},
	"click_continue_button": {
		"step": 13,
		"func": click_continue_button,
		"transitions": {
			"continue_clicked": "get_current_step",
			"no_quick_apply_page": "finish_run",
			"continue_button_not_found": "submit_application",
			"continue_button_error": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "continue_button_error",
	},
	"extract_job_details_raw": {
		"step": 18,
		"func": extract_job_details_raw,
		"transitions": {"details_extracted": "parse_job_details"},
		"timeout": 20,
		"on_timeout_event": "details_extracted",
	},
	"parse_job_details": {
		"step": 19,
		"func": parse_job_details,
		"transitions": {"parsed": "click_quick_apply"},
		"timeout": 15,
		"on_timeout_event": "parsed",
	},
	"get_current_step": {
		"step": 21,
		"func": get_current_step,
		"transitions": {
			"current_step_choose_documents": "handle_resume_selection",
			"current_step_update_profile": "handle_update_seek_profile",
			"current_step_employer_questions": "handle_answer_employer_questions",
			"current_step_review_submit": "close_quick_apply_and_continue_search",
			"current_step_unknown": "close_quick_apply_and_continue_search",
			"progress_bar_not_found": "close_quick_apply_and_continue_search",
			"progress_bar_evaluation_error": "close_quick_apply_and_continue_search",
			"no_quick_apply_page": "close_quick_apply_and_continue_search"
		},
		"timeout": 10,
		"on_timeout_event": "progress_bar_evaluation_error",
	},
	"back_button_quickapply": {
		"step": 22,
		"func": back_button_quickapply,
		"transitions": {
			"back_button_clicked": "get_current_step",
			"back_button_not_found": "close_quick_apply_and_continue_search",
			"back_button_error": "close_quick_apply_and_continue_search",
			"no_quick_apply_page": "close_quick_apply_and_continue_search"
		},
		"timeout": 10,
		"on_timeout_event": "back_button_error",
	},
	"handle_update_seek_profile": {
		"step": 23,
		"func": handle_update_seek_profile,
		"transitions": {
			"update_profile_banner_shown": "close_quick_apply_and_continue_search",
			"update_profile_error": "finish_run",
			"no_browser_context": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "update_profile_error",
	},
	"handle_answer_employer_questions": {
		"step": 24,
		"func": handle_answer_employer_questions,
		"transitions": {
			"employer_questions_handled": "close_quick_apply_and_continue_search",
			"no_employer_questions_found": "finish_run",
			"employer_questions_error": "finish_run",
			"no_quick_apply_page": "finish_run"
		},
		"timeout": 20,
		"on_timeout_event": "employer_questions_error",
	},
	"submit_application": {
		"step": 15,
		"func": submit_application,
		"transitions": {
			"application_submitted": "finish_run",
			"no_quick_apply_page": "finish_run",
			"submit_button_not_found": "finish_run",
			"submit_application_error": "finish_run"
		},
		"timeout": 15,
		"on_timeout_event": "submit_application_error",
	},
	"close_quick_apply_and_continue_search": {
		"step": 24,
		"func": close_quick_apply_and_continue_search,
		"transitions": {
			"no_original_page": "open_homepage",
			"hunting_next_job": "click_job_card",
			"close_and_continue_error": "finish_run"
		},
		"timeout": 20,
		"on_timeout_event": "employer_questions_error",
	},
	"finish_run": {
		"step": 16,
		"func": finish_run,
		"transitions": {
			"run_finished": "done",
			"finish_error": "done"
		},
		"timeout": 10,
		"on_timeout_event": "done",
	},
}     


