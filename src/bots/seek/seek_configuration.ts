// Seek bot configuration - URLs, timeouts, retry logic, etc.

export interface SeekConfiguration {
  // Base configuration
  base_url: string;
  search_path_template: string;

  // Browser settings
  browser_settings: {
    headless: boolean;
    window_size: {
      width: number;
      height: number;
    };
    user_agent?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };

  // Timeouts (in seconds)
  timeouts: {
    page_load: number;
    element_wait: number;
    navigation: number;
    login_wait: number;
    search_execution: number;
  };

  // Retry settings
  retry_settings: {
    max_retries: number;
    retry_delay: number;
    exponential_backoff: boolean;
  };

  // Humanization settings
  humanization: {
    click_delay: {
      min: number;
      max: number;
    };
    typing_speed: {
      min: number;
      max: number;
    };
    thinking_pause: {
      min: number;
      max: number;
    };
    random_mouse_movement: boolean;
    smooth_scrolling: boolean;
  };

  // Session management
  session_settings: {
    persist_session: boolean;
    session_timeout: number;
    auto_cleanup: boolean;
  };

  // Search defaults
  search_defaults: {
    default_keywords: string;
    default_location: string;
    results_per_page?: number;
    sort_by?: string;
  };

  // Error handling
  error_handling: {
    screenshot_on_error: boolean;
    continue_on_error: boolean;
    log_level: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Default Seek configuration
export const default_seek_config: SeekConfiguration = {
  base_url: "https://www.seek.com.au",
  search_path_template: "/{keywords}-jobs/in-{location}",

  browser_settings: {
    headless: false,
    window_size: {
      width: 1920,
      height: 1080
    },
    viewport: {
      width: 1920,
      height: 950
    }
  },

  timeouts: {
    page_load: 30,
    element_wait: 15,
    navigation: 20,
    login_wait: 300, // 5 minutes for manual login
    search_execution: 60
  },

  retry_settings: {
    max_retries: 3,
    retry_delay: 2,
    exponential_backoff: true
  },

  humanization: {
    click_delay: {
      min: 500,
      max: 1500
    },
    typing_speed: {
      min: 50,
      max: 150
    },
    thinking_pause: {
      min: 1000,
      max: 3000
    },
    random_mouse_movement: true,
    smooth_scrolling: true
  },

  session_settings: {
    persist_session: true,
    session_timeout: 3600, // 1 hour
    auto_cleanup: false
  },

  search_defaults: {
    default_keywords: "software engineer",
    default_location: "sydney",
    results_per_page: 25,
    sort_by: "relevance"
  },

  error_handling: {
    screenshot_on_error: true,
    continue_on_error: false,
    log_level: 'info'
  }
};

// Helper functions for configuration
export class SeekConfigHelper {
  // Build search URL from keywords and location
  static build_search_url(config: SeekConfiguration, keywords: string, location: string): string {
    const keyword_slug = this.slugify(keywords);
    const location_slug = this.slugify(location);

    let search_path = keyword_slug ? `/${keyword_slug}-jobs` : "/jobs";
    if (location_slug) {
      search_path += `/in-${location_slug}`;
    }

    return `${config.base_url}${search_path}`;
  }

  // Slugify text for URL
  static slugify(text: string): string {
    if (!text) return "";
    text = text.trim().toLowerCase();
    text = text.replace(/[^a-z0-9]+/g, "-");
    text = text.replace(/-+/g, "-");
    return text.replace(/^-|-$/g, "");
  }

  // Merge user config with defaults
  static merge_config(user_config: Partial<SeekConfiguration> = {}): SeekConfiguration {
    return {
      ...default_seek_config,
      ...user_config,
      browser_settings: {
        ...default_seek_config.browser_settings,
        ...user_config.browser_settings
      },
      timeouts: {
        ...default_seek_config.timeouts,
        ...user_config.timeouts
      },
      retry_settings: {
        ...default_seek_config.retry_settings,
        ...user_config.retry_settings
      },
      humanization: {
        ...default_seek_config.humanization,
        ...user_config.humanization
      },
      session_settings: {
        ...default_seek_config.session_settings,
        ...user_config.session_settings
      },
      search_defaults: {
        ...default_seek_config.search_defaults,
        ...user_config.search_defaults
      },
      error_handling: {
        ...default_seek_config.error_handling,
        ...user_config.error_handling
      }
    };
  }

  // Get timeout in milliseconds
  static get_timeout_ms(config: SeekConfiguration, timeout_key: keyof SeekConfiguration['timeouts']): number {
    return config.timeouts[timeout_key] * 1000;
  }

  // Get humanization delay
  static get_random_delay(config: SeekConfiguration, delay_type: 'click_delay' | 'typing_speed' | 'thinking_pause'): number {
    const delay_config = config.humanization[delay_type];
    return Math.random() * (delay_config.max - delay_config.min) + delay_config.min;
  }
}

// Export default configuration
export default default_seek_config;