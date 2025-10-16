line number	func	old	new
55	open_check_login	page_navigated	home page loaded
59	open_check_login	navigation_failed	failed to navigate
64	open_check_login	already_logged_in	login not needed
76	open_check_login	needs_login	user needs to log in
79	open_check_login	login_status_unknown	cannot determine login status
84	open_check_login	login_check_failed	failed checking login status
95	credential_login	no_page_available	no available page
104	credential_login	missing_credentials	no login credentials found
109	credential_login	login_page_loaded	login page loaded successfully
114	credential_login	username_filled	username filled successfully
119	credential_login	password_filled	password filled successfully
124	credential_login	signin_clicked	signin button clicked
129	credential_login	signin_button_click_failed	signin button click failed
135	credential_login	login_successful	login successful, on feed
138	credential_login	redirect_timeout	wait for redirect timeout
143	credential_login	login_successful	on feed, login successful
146	credential_login	login_incomplete	credentials login incomplete
150	credential_login	login_error	credential login failed
167	open_jobs_page	ok	jobs page loaded
170	open_jobs_page	retry	failed opening jobs page
183	load_applied_job_ids	ok	applied job IDs loaded
205	show_manual_login_prompt	retry	prompt displayed to user
209	show_manual_login_prompt	retry	error showing manual login
220	set_search_location	retry	jobs page missing
225	set_search_location	ok	no search location in settings
237	set_search_location	retry	location input not found
253	set_search_location	ok	search location set
256	set_search_location	retry	failed setting search location
267	set_search_keywords	retry	jobs page missing
281	set_search_keywords	ok	no keywords in settings
294	set_search_keywords	retry	keywords input not found
310	set_search_keywords	ok	search keywords set
313	set_search_keywords	retry	failed setting search keywords
324	apply_filters	ok	jobs page missing
433	apply_filters	ok	filters applied successfully
437	apply_filters	ok	filters application failed
447	get_page_info	retry	jobs page missing
465	get_page_info	ok	pagination not found
489	get_page_info	ok	page info extracted
492	get_page_info	retry	failed extracting page info
500	extract_job_details	no_jobs_page	no jobs page found
504	extract_job_details	scanning_page_elements	checking for job elements
529	extract_job_details	elements_found: titles=...	found job elements
537	extract_job_details	using_li_job_details_selector	using li selector
541	extract_job_details	using_data_occludable_selector	using data-occludable selector
545	extract_job_details	using_job_container_selector	using job container selector
550	extract_job_details	no_job_cards_found	no job cards found
554	extract_job_details	extracting_jobs: count=...	extracting job details
623	extract_job_details	extraction_progress: ...	progress on extraction
627	extract_job_details	extraction_complete: jobs=...	finished extracting jobs
628	extract_job_details	process_jobs	proceed to process jobs
632	extract_job_details	extraction_error	failed extracting jobs
643	process_jobs	finish	no jobs to process
647	process_jobs	attempt_easy_apply	starting to process jobs
650	process_jobs	finish	error processing jobs
655	process_jobs	finish	no jobs to process
667	check_job_blacklist	continue_processing	job not blacklisted
671	check_job_blacklist	continue_processing	job blacklisted
681	extract_job_description	retry	jobs page missing
687	extract_job_description	attempt_easy_apply	could not find description
692	extract_job_description	attempt_easy_apply	job description extracted
700	attempt_easy_apply	no_jobs_page	no jobs page found
708	attempt_easy_apply	no_current_job	no job to process
713	attempt_easy_apply	processing_job: ...	processing job
720	attempt_easy_apply	job_details_clicked	job details loaded
723	attempt_easy_apply	easy_apply_button_found: ...	easy apply button found
732	attempt_easy_apply	easy_apply_clicked	easy apply button clicked
735	attempt_easy_apply	modal_opening	application modal opened
738	attempt_easy_apply	upload_resume	proceeding to resume upload
741	attempt_easy_apply	easy_apply_click_failed	failed to click easy apply
744	attempt_easy_apply	external_apply	attempting external apply
747	attempt_easy_apply	no_easy_apply_button	no easy apply button found
750	attempt_easy_apply	external_apply	attempting external apply
753	attempt_easy_apply	easy_apply_error	easy apply process error
756	upload_resume	retry	jobs page missing
765	upload_resume	answer_questions	no resume path configured
770	upload_resume	answer_questions	resume file not found
790	upload_resume	answer_questions	resume uploaded successfully
794	upload_resume	answer_questions	proceeding without resume
803	answer_questions	retry	jobs page missing
812	answer_questions	submit_application	finished answering questions
816	answer_questions	retry	error answering questions
829	submit_application	no_jobs_page	no jobs page found
833	submit_application	submitting_application: ...	submitting application
840	submit_application	next_button_clicked: ...	clicked next button
844	submit_application	next_buttons_completed: ...	next buttons completed
853	submit_application	submit_button_found: ...	submit button found
856	submit_application	submit_button_clicked	submit button clicked
860	submit_application	submission_processing	submission is processing
865	submit_application	application_submitted_successfully	application submitted successfully
869	submit_application	save_applied_job	proceeding to save job
873	submit_application	done_button_found	done button found
877	submit_application	save_applied_job	proceeding to save job
881	submit_application	submission_confirmation_failed	could not confirm submission
884	submit_application	application_failed	application failed to submit
888	submit_application	submit_button_click_failed	submit button click failed
891	submit_application	application_failed	application failed to submit
895	submit_application	submit_button_not_found	no submit button found
898	submit_application	application_failed	application failed to submit
902	submit_application	submit_application_error	submit application error
905	save_applied_job	continue_processing	job saved
908	save_applied_job	continue_processing	saving job failed
917	external_apply	retry	jobs page missing
925	external_apply	save_external_job	external apply clicked
929	external_apply	application_failed	external apply failed
932	external_apply	application_failed	no apply button found
936	external_apply	retry	external apply process error
945	save_external_job	continue_processing	external job saved
948	save_external_job	continue_processing	saving external job failed
957	application_failed	continue_processing	application marked failed
960	application_failed	continue_processing	failed to mark application failed
969	continue_processing	processing_status: ...	processing job
977	continue_processing	moving_to_next_job: ...	moving to next job
978	continue_processing	attempt_easy_apply	starting next application
981	continue_processing	all_jobs_processed	all jobs processed
982	continue_processing	navigate_to_next_page	navigating to next page
985	continue_processing	continue_processing_error	continue processing error
986	continue_processing	finish	finishing workflow
995	navigate_to_next_page	retry	jobs page missing
1003	navigate_to_next_page	extract_job_details	page navigated
1006	navigate_to_next_page	finish	no more pages
1010	navigate_to_next_page	finish	navigation error
1019	finish	done	workflow finished