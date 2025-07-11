// TODO-1: 매직넘버나 스트링을 상수로 분리
// TODO-2: 설정값을 서버에서 주입받아서 사용(베너, 버전, author, license, 등...)
// TODO-6: exit 명령어 사용시, 창을 나갈지 물어보는 모달 보여주고, 창 나가기
// TODO-7: help [command]를 사용하면 자세한 설명 출력하기
// TODO-8: vi, vim, emac 등의 명령어 사용하면 터미널 처럼 편집기 모드로 들어가짐 -> 여기서 글을 작성해서 저장하면 글이 저장됨
// TODO-9: ls 명령어를 통해 저장한 글 조회 기능?(50개 까지 보여주기, 페이징 적용)
// TODO-10: 내가 작성한 글 보는 기능?
// TODO-11: 모든 API 요청에 대한 공통 함수 만들어서 사용?(credentials: "include" 적용)
// TODO-14: 필드에 대한 검증 로직을 클라이언트 사이드에서 다시 정의해서 사용하고 있음
// - 서버사이드에서 규칙을 가져오는 방법은 없을까?(SSOT으로 관리하고 싶음)
// - properties 파일을 하나 만들어서 규칙을 외부에서 주입하는 방식 고려
// TODO-15: 코드 가독성 리팩토링
// TODO-16: JS 모듈화
// TODO-17: 영문을 제외한 문자의 입력, 특히 한글같은 조합 문자 입력에 대한 처리
// - 현재는 한글 중심으로 처리 로직을 만들었지만, 입력 입력에 대해서는 모든 언어가 가능했으면 좋겠음

/**
 * TISSUE
 * Terminal Style UI/UX
 * 명령어 기반 터미널 인터페이스
 */
class TissueTerminal {
  constructor() {
    // 시스템 상태
    this.isInitialized = false;
    this.isDestroyed = false;
    this.bootCompleted = false;

    // DOM 요소들
    this.terminalScreen = null;
    this.terminalHistory = null;
    this.currentPrompt = null;
    this.currentInput = null;
    this.terminalCursor = null;
    this.focusKeeper = null;

    // 커서 현재 위치
    this.cursorPosition = 0;

    // 입력 상태
    this.currentInputText = "";
    this.commandHistory = [];
    this.historyIndex = -1;

    // 한글 조합 상태
    this.isComposing = false;
    this.lastInputValue = "";

    // 시스템 설정
    this.promptPrefix = "guest@tissue:~$ ";
    this.systemName = "TISSUE Terminal";

    // 기본 테마
    this.DEFAULT_THEME = "solarizedlight";

    // 회원가입 관련 상태 변수들
    this.signupInProgress = false;
    this.signupStep = 0;
    this.signupData = {};
    this.currentFieldInfo = null;

    // 이메일 인증 관련
    this.emailVerificationStatus = "none";
    this.emailPollingInterval = null;

    // 로그인 관련 상태
    this.isLoggedIn = false;
    this.currentUser = null;
    this.loginInProgress = false;
    this.loginStep = 0;
    this.loginData = {};

    // 프로필 수정 관련 상태
    this.editInProgress = false;
    this.editStep = 0;
    this.editData = {};
    this.editFieldInfo = null;

    // JobType 선택 관련 상태
    this.jobTypeSelectionMode = false;
    this.jobTypeOptions = [];
    this.jobTypeSelectedIndex = -1;
    this.jobTypeDisplayedOptions = [];

    this.jobTypeSessionId = null; // JobType 재진행 구분을 위한 id

    // 언어
    this.currentLanguage = this.detectLanguage(); // 'en' 기본, 한국어 브라우저만 'ko'

    // JobType 관련 상태
    this.jobTypes = null;
    this.jobTypesLoaded = false;

    // 테마 관련 상태
    this.currentTheme = this.DEFAULT_THEME; // 기본 테마 설정
    this.availableThemes = {
      dark: {
        name: "Dark",
        description: "Classic dark theme",
      },
      light: {
        name: "Light",
        description: "Bright and clean light theme",
      },
      nightwing: {
        name: "Nightwing",
        description: "Dark theme with purple accents",
      },
      solarizedlight: {
        name: "Solarized Light",
        description: "Soft, balanced contrast",
      },
      neon: {
        name: "Neon",
        description: "Neon tones",
      },
      cherryash: {
        name: "Cherry Ash",
        description: "Dark with red and orange flair",
      },
    };

    // 로컬 스토리지에서 저장된 테마 로드
    this.loadSavedTheme();

    // 다국어 메시지 시스템
    this.messages = this.initializeMessages();

    // 서버 데이터 로드
    this.loadServerConfig();

    // 초기화 시작
    this.initialize();
  }

  /**
   * 서버 설정 로드
   */
  loadServerConfig() {
    const config = window.TISSUE_CONFIG || {};
    this.systemInfo = config.systemInfo || {
      version: "1.0.0",
      repository: "github.com/your-username/tissue",
      author: "Your Name",
      email: "your.email@example.com",
      license: "MIT",
      documentation: "tissue.docs.example.com",
    };

    console.log("TISSUE Terminal: Config loaded", this.systemInfo);
  }

  /**
   * 시스템 초기화
   */
  async initialize() {
    try {
      console.log("TISSUE Terminal: Initializing...");

      // DOM이 준비될 때까지 대기
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve);
        });
      }

      // DOM 요소 설정
      this.setupDOMElements();

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // 초기화 전용 테마 설정
      this.initializeTheme();

      // 부팅 완료
      this.bootCompleted = true;
      this.isInitialized = true;

      // 포커스 설정
      this.maintainFocus();

      // 자동으로 banner 명령어 실행 (초기 환영 메시지)
      await this.executeCommand("banner");

      // JobType 미리 로드 (백그라운드에서)
      this.preloadJobTypes();

      // 언어 확인
      console.log("TISSUE Terminal: Ready");
      console.log("Current language: ", terminal.currentLanguage);
      console.log("Browser language: ", navigator.language);

      console.log(`Current theme: ${this.currentTheme}`);
    } catch (error) {
      console.error("TISSUE Terminal: Initialization failed", error);
      this.showCriticalError("System initialization failed");
    }
  }

  /**
   * DOM 요소 설정
   */
  setupDOMElements() {
    this.terminalScreen = document.getElementById("terminal-screen");
    this.terminalHistory = document.getElementById("terminal-history");
    this.currentPrompt = document.getElementById("current-prompt");
    this.currentInput = document.getElementById("current-input");
    this.terminalCursor = document.getElementById("terminal-cursor");
    this.focusKeeper = document.getElementById("focus-keeper");

    if (!this.terminalScreen) {
      throw new Error("Terminal screen element not found");
    }

    // 포커스 키퍼 설정
    if (this.focusKeeper) {
      this.focusKeeper.addEventListener("blur", () => {
        setTimeout(() => this.maintainFocus(), 10);
      });
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // input 이벤트로 한글 입력 보완
    // document.addEventListener("input", (e) => this.handleInputEvent(e), true);

    // IME 이벤트들
    document.addEventListener("compositionstart", (e) =>
      this.handleCompositionStart(e)
    );
    document.addEventListener("compositionupdate", (e) =>
      this.handleCompositionUpdate(e)
    );
    document.addEventListener("compositionend", (e) =>
      this.handleCompositionEnd(e)
    );

    // 전역 키보드 이벤트
    document.addEventListener("keydown", (e) => this.handleKeyPress(e), true);

    // 전역 클릭 이벤트 - 어디를 클릭해도 터미널에 포커스
    document.addEventListener("click", () => this.maintainFocus());

    // 윈도우 포커스 이벤트
    window.addEventListener("focus", () => this.maintainFocus());

    // 페이지 언로드 시 정리
    window.addEventListener("beforeunload", () => this.cleanup());

    // 복사/붙여넣기 지원
    document.addEventListener("paste", (e) => this.handlePaste(e));

    // 터미널 화면 클릭 시 포커스 유지
    if (this.terminalScreen) {
      this.terminalScreen.addEventListener("click", (e) => {
        e.preventDefault();
        this.maintainFocus();
      });
    }
  }

  /**
   * 다국어 메시지 초기화
   */
  initializeMessages() {
    return {
      ko: {
        // 배너 관련 메시지
        systemTitle: "터미널 이슈 관리 및 협업 시스템",
        typeHelpToSeeCommands:
          "<span class=\"command-highlight\">'help'</span> 명령어를 입력하여 사용 가능한 명령어 목록을 확인하세요.",

        // 시스템 정보 라벨
        repository: "저장소:",
        author: "개발자:",
        license: "라이선스:",
        documentation: "문서:",

        // 공통 메시지
        required: "✗ 이 필드는 필수입니다",
        skipped: "⊝ 건너뜀",
        cancelled: "취소됨",
        loading: "로딩 중...",
        networkError: "네트워크 오류가 발생했습니다",
        pleaseWait: "잠시만 기다려주세요...",
        tryAgainLater: "나중에 다시 시도해주세요",
        authenticationFailed: "인증에 실패했습니다",
        sessionExpired: "✗ 세션이 만료되었습니다",
        loginAgain: "다시 로그인해주세요",
        checkConnection: "연결을 확인해주세요",

        // 테마 관련
        themeChanged: "테마가 {0}(으)로 변경되었습니다",
        themeAlreadyActive: "이미 {0} 테마를 사용 중입니다",
        themeNotFound: "알 수 없는 테마: {0}",
        themeApplyFailed: "테마 적용 실패: {0}",
        themeListTitle: "사용 가능한 테마:",
        themeUsage: "사용법: theme [테마명]",
        themeExample: "예시: theme dark",
        currentTheme: "현재 테마: {0}",
        themeDescription: "설명: {0}",
        themeCurrent: "현재",
        themeTabTip: "팁: 테마명 자동완성은 Tab 키를 사용하세요",
        helpThemeSection: "테마 예시:",
        helpTheme: "터미널 테마 변경",

        // 명령어 관련
        commandNotFound: "명령어를 찾을 수 없습니다",
        typeHelpForCommands: "'help' 명령어로 사용 가능한 명령어를 확인하세요.",
        availableCommands: "사용 가능한 명령어:",
        terminalControls: "Ctrl+L로 화면 지우기, Ctrl+C로 입력 취소.",
        commandCompletion:
          "Tab으로 명령어 완성, 위/아래 화살표로 명령어 히스토리.",
        goodbye: "안녕히 가세요!",
        tabCompletionAvailable: "사용 가능한 자동완성:",

        // 회원가입 관련
        registrationWizard: "TISSUE REGISTRATION WIZARD",
        welcomeRegistration:
          "환영합니다! 이 마법사가 회원가입 과정을 안내해드립니다.",
        canCancelAnytime: "언제든지 Ctrl+C로 회원가입을 취소할 수 있습니다.",
        optionalFieldsSkip:
          "선택 필드는 빈 값으로 Enter를 눌러 건너뛸 수 있습니다.",
        stepProgress: "단계",
        optional: "(선택사항)",
        skipEmptyInput: "빈 값으로 Enter를 눌러 이 필드를 건너뛰세요",
        signupInProgress: "회원가입 과정이 이미 진행 중입니다.",
        useCtrlCToCancel: "Ctrl+C로 취소하세요.",

        // 회원가입 필드
        loginIdPrompt: "로그인 ID",
        loginIdDesc: "4-20자의 영문, 숫자, 언더스코어",
        emailPrompt: "이메일 주소",
        emailDesc: "유효한 이메일 주소 (인증 필요)",
        usernamePrompt: "사용자명",
        usernameDesc: "표시될 사용자명 (4-20자)",
        passwordPrompt: "비밀번호",
        passwordDesc: "8자 이상, 영문, 숫자, 특수문자 포함",
        confirmPasswordPrompt: "비밀번호 확인",
        confirmPasswordDesc: "비밀번호를 다시 입력해주세요",
        namePrompt: "이름",
        nameDesc: "실명 (선택사항)",
        birthDatePrompt: "생년월일",
        birthDateDesc: "YYYY-MM-DD 형식 (선택사항)",
        jobTypePrompt: "직업 유형",
        jobTypeDesc: "직업 분야 (선택사항, 'list'로 옵션 보기)",

        // 회원가입 진행
        processingRegistration: "🔄 회원가입을 처리하는 중...",
        creatingAccount: "시스템에 계정을 생성하고 있습니다...",
        registrationComplete: "회원가입이 성공적으로 완료되었습니다!",
        welcomeToTissue: "🎉 TISSUE에 오신 것을 환영합니다!",
        username: "사용자명",
        loginId: "로그인 ID",
        email: "이메일",
        canNowLogin: "'login' 명령어로 계정에 로그인할 수 있습니다.",
        registrationFailed: "✗ 회원가입에 실패했습니다",
        registrationCancelled: "사용자에 의해 회원가입이 취소되었습니다",
        unexpectedError: "예상치 못한 오류가 발생했습니다",
        trySignupAgain: "'signup' 명령어로 다시 시도할 수 있습니다.",

        // 로그인 관련
        tissueLogin: "TISSUE LOGIN",
        enterCredentials: "로그인 자격 증명을 입력해주세요.",
        canCancelLogin: "Ctrl+C로 로그인 과정을 취소할 수 있습니다.",
        loginIdOrEmail: "로그인 ID (또는 이메일)",
        password: "비밀번호",
        authenticating: "🔐 인증 중...",
        loginSuccessful: "✓ 로그인 성공!",
        welcomeBack: "다시 오신 것을 환영합니다",
        invalidCredentials: "✗ 잘못된 자격 증명입니다",
        checkCredentials: "로그인 ID (또는 이메일)와 비밀번호를 확인해주세요.",
        loginFailed: "✗ 로그인에 실패했습니다",
        loginCancelled: "사용자에 의해 로그인이 취소되었습니다",
        loginInProgress: "로그인 과정이 이미 진행 중입니다.",

        // 로그아웃 관련
        loggingOut: "🔓 로그아웃 중...",
        loggedOutSuccessfully: "✓ 성공적으로 로그아웃되었습니다",
        thankYouForUsing: "TISSUE를 이용해 주셔서 감사합니다!",
        notLoggedIn: "로그인되어 있지 않습니다.",

        // 프로필 관련
        pleaseLoginFirst: "먼저 로그인해주세요",
        loadingProfile: "📋 프로필 정보를 로딩 중...",
        userProfile: "USER PROFILE",
        notSet: "설정되지 않음",
        useEditCommand:
          "'edit [필드명]' 명령어로 프로필 정보를 수정할 수 있습니다.",
        availableFields:
          "사용 가능한 필드: username, email, name, birthDate, jobType, password",
        failedToLoadProfile: "✗ 프로필 로딩에 실패했습니다",
        loggedInAs: "로그인 상태",
        notLoggedInGuest: "로그인하지 않음 (게스트 세션)",

        // 프로필 수정 관련
        profileEditMode: "✏️ 프로필 수정 모드",
        editing: "수정 중",
        canCancelEditing: "Ctrl+C로 수정을 취소할 수 있습니다.",
        editUsage: "사용법: edit [필드명]",
        editInProgress: "프로필 수정이 이미 진행 중입니다.",
        unknownField: "✗ 알 수 없는 필드",
        availableFieldsList: "사용 가능한 필드",
        currentPassword: "현재 비밀번호",
        enterCurrentPassword: "먼저 현재 비밀번호를 입력해주세요:",
        verifyingPassword: "🔐 비밀번호를 확인하고 권한을 획득하는 중...",
        permissionGranted: "✓ 권한이 부여되었습니다",
        incorrectCurrentPassword: "✗ 현재 비밀번호가 틀렸습니다",
        currentPasswordIncorrect: "입력하신 현재 비밀번호가 틀렸습니다.",
        newPassword: "새 비밀번호",
        enterNewPassword: "이제 새로운 {0}을(를) 입력하세요:",
        enterNewField: "이제 새로운 {0}을(를) 입력하세요:",
        confirmNewPassword: "새 비밀번호 확인",
        confirmNewPasswordPrompt: "새 비밀번호를 확인해주세요:",
        passwordsDoNotMatch: "✗ 비밀번호가 일치하지 않습니다",
        updatingProfile: "🔄 프로필을 업데이트하는 중...",
        profileUpdatedSuccessfully: "✓ 프로필이 성공적으로 업데이트되었습니다!",
        passwordChanged: "비밀번호가 변경되었습니다",
        useNewPasswordForLogin: "향후 로그인 시 새 비밀번호를 사용해주세요",
        permissionExpired: "✗ 권한이 만료되었거나 불충분합니다",
        tryEditCommandAgain: "edit 명령어를 다시 시도해주세요.",
        valueAlreadyInUse: "이미 사용 중인 값입니다",
        updateFailed: "업데이트에 실패했습니다",
        profileEditingCancelled: "프로필 수정이 취소되었습니다",

        // 이메일 인증 관련
        sendingVerificationEmail: "📧 인증 이메일을 보내는 중...",
        verificationEmailSent: "✓ 인증 이메일이 성공적으로 전송되었습니다!",
        waitingEmailVerification: "⏳ 이메일 인증을 기다리는 중...",
        checkEmailAndClick: "이메일을 확인하고 인증 링크를 클릭해주세요",
        processWillContinue: "이 과정은 자동으로 계속됩니다",
        failedToSendEmail: "인증 이메일 전송에 실패했습니다",
        emailVerificationTimeout: "⏰ 이메일 인증 시간 초과",
        tryAgainOrContact: "다시 시도하거나 지원팀에 문의하세요",
        emailVerifiedSuccessfully: "✅ 이메일이 성공적으로 인증되었습니다!",
        emailAlreadyVerified: "✓ 이메일이 이미 인증되었습니다",

        // JobType 관련
        loadingJobTypes: "사용 가능한 직업 유형을 로딩 중...",
        availableJobTypes: "사용 가능한 직업 유형:",
        failedToLoadJobTypes:
          "직업 유형 로딩에 실패했습니다. 다시 시도해주세요.",
        jobTypeSkipped: "⊝ 직업 유형 건너뜀",
        unableToLoadFromServer:
          "서버에서 직업 유형을 로딩할 수 없습니다. 폴백 목록 사용:",
        usingFallbackList: "네트워크 오류로 인한 폴백 목록 사용:",
        selectFromOptionsAbove: "위 옵션에서 선택해주세요",
        helpJobTypeSelection:
          "💡 ↑/↓ 키로 항목을 이동하고, Enter로 선택하거나 직접 입력하세요",

        // 검증 오류 메시지
        loginIdValidation:
          "로그인 ID는 4-20자의 영문, 숫자, 언더스코어만 가능합니다",
        loginIdTaken: "이 로그인 ID는 이미 사용 중입니다",
        unableToVerifyLoginId: "로그인 ID 사용 가능 여부를 확인할 수 없습니다",
        enterValidEmail: "유효한 이메일 주소를 입력해주세요",
        emailAlreadyRegistered: "이 이메일은 이미 등록되어 있습니다",
        unableToVerifyEmail: "이메일 사용 가능 여부를 확인할 수 없습니다",
        passwordMinLength: "비밀번호는 최소 8자 이상이어야 합니다",
        passwordRequirements:
          "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다",
        usernameLength: "사용자명은 4-20자 사이여야 합니다",
        usernameFormat:
          "사용자명은 문자로 시작하고 문자와 숫자만 포함해야 합니다",
        usernameTaken: "이 사용자명은 이미 사용 중입니다",
        unableToVerifyUsername: "사용자명 사용 가능 여부를 확인할 수 없습니다",
        nameLength: "이름은 50자 이하여야 합니다",
        nameInvalidChars: "이름에 유효하지 않은 문자가 포함되어 있습니다",
        birthDateFormat: "YYYY-MM-DD 형식을 사용해주세요",
        invalidDate: "유효하지 않은 날짜입니다",
        birthDateFuture: "생년월일은 미래일 수 없습니다",
        enterValidBirthDate: "유효한 생년월일을 입력해주세요",

        // 언어 변경
        currentLanguage: "현재 언어",
        languageUsage: "사용법: lang [ko|en]",
        unsupportedLanguage: "✗ 지원하지 않는 언어입니다",
        availableLanguages: "사용 가능한 언어: ko, en",
        changingLanguage: "🌐 언어를 변경하는 중",
        languageChanged: "✓ 언어가 성공적으로 변경되었습니다",

        // 명령어 설명
        commandDescriptions: {
          banner: "시스템 배너와 정보 표시",
          lang: "언어 변경",
          theme: "터미널 테마 변경",
          help: "이 도움말 메시지 표시",
          info: "시스템 정보 표시",
          version: "tissue의 현재 버전 표시",
          date: "현재 날짜와 시간 표시",
          echo: "주어진 텍스트 출력",
          whoami: "현재 사용자명 표시",
          clear: "터미널 화면 지우기",
          exit: "터미널 종료",
          status: "현재 로그인 상태 표시",
          signup: "새 사용자 계정 생성",
          login: "계정에 로그인",
          logout: "계정에서 로그아웃",
          profile: "프로필 정보 보기",
          edit: "프로필 정보 수정",
        },
        noDescriptionAvailable: "설명이 없습니다",
      },

      en: {
        // Banner related messages
        systemTitle: "Terminal Issue Management & Collaboration",
        typeHelpToSeeCommands:
          "Type <span class=\"command-highlight\">'help'</span> to see the list of available commands.",

        // System-info labels
        repository: "Repository:",
        author: "Author:",
        license: "License:",
        documentation: "Documentation:",

        // Common messages
        required: "✗ This field is required",
        skipped: "⊝ Skipped",
        cancelled: "Cancelled",
        loading: "Loading...",
        networkError: "Network error occurred",
        pleaseWait: "Please wait...",
        tryAgainLater: "Please try again later",
        authenticationFailed: "Authentication failed",
        sessionExpired: "✗ Session expired",
        loginAgain: "Please login again",
        checkConnection: "Please check your connection",

        // Theme related
        themeChanged: "Theme changed to: {0}",
        themeAlreadyActive: "Already using theme: {0}",
        themeNotFound: "Unknown theme: {0}",
        themeApplyFailed: "Failed to apply theme: {0}",
        themeListTitle: "Available themes:",
        themeUsage: "Usage: theme [theme-name]",
        themeExample: "Example: theme dark",
        currentTheme: "Current theme: {0}",
        themeDescription: "Description: {0}",
        themeCurrent: "current",
        themeTabTip: "Tip: Use Tab key for theme name completion",
        helpThemeSection: "Theme Examples:",

        // Command related
        commandNotFound: "command not found",
        typeHelpForCommands: "Type 'help' to see available commands.",
        availableCommands: "Available commands:",
        terminalControls: "Use Ctrl+L to clear screen, Ctrl+C to cancel input.",
        commandCompletion:
          "Use Tab for command completion, Up/Down arrows for command history.",
        goodbye: "Goodbye!",
        tabCompletionAvailable: "Available completions:",

        // Signup related
        registrationWizard: "TISSUE REGISTRATION WIZARD",
        welcomeRegistration:
          "Welcome! This wizard will guide you through the registration process.",
        canCancelAnytime:
          "You can use Ctrl+C at any time to cancel the registration.",
        optionalFieldsSkip:
          "Optional fields can be skipped by pressing Enter with empty input.",
        stepProgress: "Step",
        optional: "(optional)",
        skipEmptyInput: "Press Enter with empty input to skip this field",
        signupInProgress: "Signup process is already in progress.",
        useCtrlCToCancel: "Use Ctrl+C to cancel.",

        // Signup fields
        loginIdPrompt: "Login ID",
        loginIdDesc:
          "4-20 alphanumeric characters (letters, numbers, underscore)",
        emailPrompt: "Email Address",
        emailDesc: "Valid email address (verification required)",
        usernamePrompt: "Username",
        usernameDesc: "Your username (4-20 characters)",
        passwordPrompt: "Password",
        passwordDesc:
          "At least 8 characters with letters, numbers, and symbols",
        confirmPasswordPrompt: "Confirm Password",
        confirmPasswordDesc: "Re-enter your password for confirmation",
        namePrompt: "Name",
        nameDesc: "Your given name (optional)",
        birthDatePrompt: "Birth Date",
        birthDateDesc: "YYYY-MM-DD format (optional)",
        jobTypePrompt: "Job Type",
        jobTypeDesc: "Your profession (optional, type 'list' to see options)",

        // Signup progress
        processingRegistration: "🔄 Processing registration...",
        creatingAccount: "Creating your account in the system...",
        registrationComplete: "Registration completed successfully!",
        welcomeToTissue: "🎉 Welcome to TISSUE!",
        username: "Username",
        loginId: "Login ID",
        email: "Email",
        canNowLogin:
          "You can now use 'login' command to sign in to your account.",
        registrationFailed: "✗ Registration failed",
        registrationCancelled: "Registration cancelled by user",
        unexpectedError: "An unexpected error occurred",
        trySignupAgain: "You can try again by using the 'signup' command.",

        // Login related
        tissueLogin: "TISSUE LOGIN",
        enterCredentials: "Please enter your login credentials.",
        canCancelLogin: "Use Ctrl+C to cancel login process.",
        loginIdOrEmail: "Login ID (or Email)",
        password: "Password",
        authenticating: "🔐 Authenticating...",
        loginSuccessful: "✓ Login successful!",
        welcomeBack: "Welcome back",
        invalidCredentials: "✗ Invalid credentials",
        checkCredentials: "Please check your login ID (or email) and password.",
        loginFailed: "✗ Login failed",
        loginCancelled: "Login cancelled by user",
        loginInProgress: "Login process is already in progress.",

        // Logout related
        loggingOut: "🔓 Logging out...",
        loggedOutSuccessfully: "✓ Logged out successfully",
        thankYouForUsing: "Thank you for using TISSUE!",
        notLoggedIn: "You are not logged in.",

        // Profile related
        pleaseLoginFirst: "Please login first",
        loadingProfile: "📋 Loading profile information...",
        userProfile: "USER PROFILE",
        notSet: "Not set",
        useEditCommand: "Use 'edit [field]' to modify profile information.",
        availableFields:
          "Available fields: username, email, name, birthDate, jobType, password",
        failedToLoadProfile: "✗ Failed to load profile",
        loggedInAs: "Logged in as",
        notLoggedInGuest: "Not logged in (guest session)",

        // Profile edit related
        profileEditMode: "✏️ PROFILE EDIT MODE",
        editing: "Editing",
        canCancelEditing: "Use Ctrl+C to cancel editing.",
        editUsage: "Usage: edit [field]",
        editInProgress: "Profile editing is already in progress.",
        unknownField: "✗ Unknown field",
        availableFieldsList: "Available fields",
        currentPassword: "Current Password",
        enterCurrentPassword: "First, please enter your current password:",
        verifyingPassword: "🔐 Verifying password and getting permission...",
        permissionGranted: "✓ Permission granted",
        incorrectCurrentPassword: "✗ Incorrect current password",
        currentPasswordIncorrect:
          "The current password you entered is incorrect.",
        newPassword: "New Password",
        enterNewPassword: "Now enter your new {0}:",
        enterNewField: "Now enter your new {0}:",
        confirmNewPassword: "Confirm New Password",
        confirmNewPasswordPrompt: "Please confirm your new password:",
        passwordsDoNotMatch: "✗ Passwords do not match",
        updatingProfile: "🔄 Updating profile...",
        profileUpdatedSuccessfully: "✓ Profile updated successfully!",
        passwordChanged: "Password has been changed",
        useNewPasswordForLogin:
          "Please use your new password for future logins",
        permissionExpired: "✗ Permission expired or insufficient",
        tryEditCommandAgain: "Please try the edit command again.",
        valueAlreadyInUse: "Value already in use",
        updateFailed: "Update failed",
        profileEditingCancelled: "Profile editing cancelled",

        // Email verification related
        sendingVerificationEmail: "📧 Sending verification email...",
        verificationEmailSent: "✓ Verification email sent successfully!",
        waitingEmailVerification: "⏳ Waiting for email verification...",
        checkEmailAndClick: "Check your email and click the verification link",
        processWillContinue: "This process will continue automatically",
        failedToSendEmail: "Failed to send verification email",
        emailVerificationTimeout: "⏰ Email verification timeout",
        tryAgainOrContact: "Please try again or contact support",
        emailVerifiedSuccessfully: "✅ Email verified successfully!",
        emailAlreadyVerified: "✓ Email already verified",

        // JobType related
        loadingJobTypes: "Loading available job types...",
        availableJobTypes: "Available job types:",
        failedToLoadJobTypes: "Failed to load job types. Please try again.",
        jobTypeSkipped: "⊝ Job Type skipped",
        unableToLoadFromServer:
          "Unable to load job types from server. Using fallback list:",
        usingFallbackList:
          "Network error loading job types. Using fallback list:",
        selectFromOptionsAbove: "Please select from the options above",
        helpJobTypeSelection:
          "💡 Use ↑/↓ arrows to navigate, Enter to select, or type directly",

        // Validation error messages
        loginIdValidation:
          "Login ID must be 4-20 characters (letters, numbers, underscore only)",
        loginIdTaken: "This Login ID is already taken",
        unableToVerifyLoginId: "Unable to verify Login ID availability",
        enterValidEmail: "Please enter a valid email address",
        emailAlreadyRegistered: "This email is already registered",
        unableToVerifyEmail: "Unable to verify email availability",
        passwordMinLength: "Password must be at least 8 characters long",
        passwordRequirements:
          "Password must contain letters, numbers, and symbols",
        usernameLength: "Username must be between 4 and 20 characters",
        usernameFormat:
          "Username must start with a letter and contain only letters and numbers",
        usernameTaken: "This username is already taken",
        unableToVerifyUsername: "Unable to verify username availability",
        nameLength: "Name must be 50 characters or less",
        nameInvalidChars: "Name contains invalid characters",
        birthDateFormat: "Please use YYYY-MM-DD format",
        invalidDate: "Invalid date",
        birthDateFuture: "Birth date cannot be in the future",
        enterValidBirthDate: "Please enter a valid birth date",

        // Language change
        currentLanguage: "Current language",
        languageUsage: "Usage: lang [ko|en]",
        unsupportedLanguage: "✗ Unsupported language",
        availableLanguages: "Available languages: ko, en",
        changingLanguage: "🌐 Changing language to",
        languageChanged: "✓ Language changed successfully",

        // Command descriptions
        commandDescriptions: {
          banner: "Display system banner and information",
          lang: "Change language",
          theme: "Change terminal theme",
          help: "Show this help message",
          info: "Display system information",
          version: "Show current version of tissue",
          date: "Display current date and time",
          echo: "Echo the given text",
          whoami: "Display current username",
          clear: "Clear the terminal screen",
          exit: "Exit the terminal",
          status: "Show current login status",
          signup: "Create a new user account",
          login: "Sign in to your account",
          logout: "Sign out from your account",
          profile: "View your profile information",
          edit: "Edit profile information",
        },
        noDescriptionAvailable: "No description available",
      },
    };
  }

  /**
   * 테마 관련 메서드
   */

  /**
   * 저장된 테마 로드
   */
  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem("tissue-terminal-theme");
      if (savedTheme && this.availableThemes[savedTheme]) {
        this.currentTheme = savedTheme;
        console.log(`Loaded saved theme: ${savedTheme}`);
      } else {
        console.log(
          `No saved theme found, using defualt theme: ${this.currentTheme}`
        );
      }
    } catch (error) {
      console.warn(
        `Failed to load theme, using default theme: ${this.currentTheme}`,
        error
      );
    }
  }

  /**
   * 테마 저장
   */
  saveTheme(themeName) {
    try {
      localStorage.setItem("tissue-terminal-theme", themeName);
    } catch (error) {
      console.warn("Failed to save theme:", error);
    }
  }

  /**
   * 테마 적용 (사용자 액션용)
   */
  applyTheme(themeName) {
    if (!this.availableThemes[themeName]) {
      throw new Error(`Unknown theme: ${themeName}`);
    }

    // HTML 요소에 data-theme 속성 설정
    document.documentElement.setAttribute("data-theme", themeName);

    // 현재 테마 업데이트
    this.currentTheme = themeName;

    // 동적 스타일 조정
    this.adjustDynamicStyles();

    // 테마 저장
    this.saveTheme(themeName);

    // 테마 변경 알림
    this.addHistoryLine(
      this.getMessage("themeChanged", this.availableThemes[themeName].name),
      "success-msg"
    );

    console.log(`Theme changed to ${themeName}`);
  }

  /**
   * 테마 적용 (초기화용)
   */
  initializeTheme() {
    // 유효하지 않은 테마면 기본값으로 복원
    if (!this.availableThemes[this.currentTheme]) {
      console.warn(
        `Invalid theme '${this.currentTheme}', falling back to default: ${this.DEFAULT_THEME}`
      );
      this.currentTheme = this.DEFAULT_THEME;
    }

    // HTML 요소에 data-theme 속성 설정
    document.documentElement.setAttribute("data-theme", this.currentTheme);

    // 동적 스타일 조정
    this.adjustDynamicStyles();

    console.log(`Theme initialized: ${this.currentTheme}`);
  }

  /**
   * 현재 테마 정보 표시
   */
  showCurrentTheme() {
    const theme = this.availableThemes[this.currentTheme];
    this.addHistoryLine(
      this.getMessage("currentTheme", theme.name),
      "info-msg"
    );
    // this.addHistoryLine(
    //   this.getMessage("themeDescription", theme.description),
    //   "system-msg"
    // );
  }

  /**
   * 사용 가능한 테마 목록 표시
   */
  showAvailableThemes() {
    this.addHistoryLine(this.getMessage("themeListTitle"), "info-msg");
    this.addHistoryLine("", "");

    Object.entries(this.availableThemes).forEach(([key, theme]) => {
      const isCurrentTheme = key === this.currentTheme;
      const prefix = isCurrentTheme ? "→ " : "  ";

      const suffix = isCurrentTheme
        ? ` (${this.getMessage("themeCurrent")})`
        : "";
      const className = isCurrentTheme ? "command-highlight" : "system-msg";

      this.addHistoryLine(
        `${prefix}${key.padEnd(15)} - ${theme.name}${suffix}`,
        className
      );
      // this.addHistoryLine(`${" ".repeat(17)}${theme.description}`, "help-msg");
      this.addHistoryLine("", "");
    });

    // 🔥 getMessage 적용
    this.addHistoryLine(this.getMessage("themeUsage"), "info-msg");
    this.addHistoryLine(this.getMessage("themeExample"), "system-msg");
  }

  /**
   * 테마 명령어 처리
   */
  handleThemeCommand(args) {
    // 인자가 없으면 현재 테마와 사용 가능한 테마 목록 표시
    if (args.length === 0) {
      this.showCurrentTheme();
      this.addHistoryLine("", "");
      this.showAvailableThemes();
      return;
    }

    const themeName = args[0].toLowerCase();

    // 특별 명령어들
    if (themeName === "list" || themeName === "ls") {
      this.showAvailableThemes();
      return;
    }

    if (themeName === "current" || themeName === "show") {
      this.showCurrentTheme();
      return;
    }

    if (themeName === "reset") {
      this.applyTheme("dark");
      return;
    }

    if (themeName === "random") {
      const themeNames = Object.keys(this.availableThemes);
      const randomTheme =
        themeNames[Math.floor(Math.random() * themeNames.length)];
      this.applyTheme(randomTheme);
      return;
    }

    // 정확한 매칭만 지원
    if (this.availableThemes[themeName]) {
      if (themeName === this.currentTheme) {
        this.addHistoryLine(
          this.getMessage(
            "themeAlreadyActive",
            this.availableThemes[themeName].name
          ),
          "warning-msg"
        );
        return;
      }

      try {
        this.applyTheme(themeName);
      } catch (error) {
        this.addHistoryLine(
          this.getMessage("themeApplyFailed", error.message),
          "error-msg"
        );
      }
    } else {
      // 매칭되는 테마가 없으면 바로 에러 + 목록 표시
      this.addHistoryLine(
        this.getMessage("themeNotFound", themeName),
        "error-msg"
      );
      this.addHistoryLine("", "");
      this.addHistoryLine(this.getMessage("themeListTitle"), "info-msg");

      const themeList = Object.keys(this.availableThemes);
      this.addHistoryLine(themeList.join(", "), "system-msg");
      this.addHistoryLine("", "");
      this.addHistoryLine(this.getMessage("themeTabTip"), "help-msg");
    }
  }

  /**
   * 동적 스타일 조정
   */
  adjustDynamicStyles() {
    // 예: 특정 테마에서만 필요한 추가 스타일 적용
    const dynamicStyle = document.getElementById("dynamic-theme-style");

    if (dynamicStyle) {
      dynamicStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "dynamic-theme-style";

    // 네온 테마에서 글로우 효과 추가
    if (this.currentTheme === "neon") {
      style.textContent = `
      .ascii-banner {
        text-shadow: 0 0 10px currentColor;
      }
      .terminal-cursor {
        text-shadow: 0 0 8px currentColor;
      }
      .success-msg {
        text-shadow: 0 0 6px currentColor;
      }
      .error-msg {
        text-shadow: 0 0 6px currentColor;
      }
    `;
    }

    document.head.appendChild(style);
  }

  // ======== 한글 입력 처리 ========

  /**
   * 한글 입력 감지
   */
  isKoreanInput(event) {
    // 한글 자음/모음 유니코드 범위 확인
    const key = event.key;
    if (key.length !== 1) return false;

    const code = key.charCodeAt(0);

    // 한글 자음 (ㄱ-ㅎ): U+3131-U+314E
    // 한글 모음 (ㅏ-ㅣ): U+314F-U+3163
    // 한글 음절 (가-힣): U+AC00-U+D7A3
    return (
      (code >= 0x3131 && code <= 0x3163) || // 자모
      (code >= 0xac00 && code <= 0xd7a3)
    ); // 완성된 한글
  }

  /**
   * IME 조합 시작
   */
  handleCompositionStart(event) {
    this.isComposing = true;
    console.log("Composition started");

    this.cleanupPendingInput();
  }

  /**
   * 대기 중인 입력 정리
   */
  cleanupPendingInput() {
    // 마지막에 잘못 입력된 한글 자모가 있으면 제거
    if (this.currentInputText.length > 0) {
      const lastChar = this.currentInputText[this.currentInputText.length - 1];
      const lastCharCode = lastChar.charCodeAt(0);

      // 마지막 문자가 한글 자모 (미완성)이면 제거
      if (lastCharCode >= 0x3131 && lastCharCode <= 0x3163) {
        console.log("Removing incomplete Korean character:", lastChar);
        this.currentInputText = this.currentInputText.slice(0, -1);
        this.cursorPosition = this.currentInputText.length;
      }
    }
  }

  /**
   * IME(한글) 조합 업데이트
   */
  handleCompositionUpdate(event) {
    if (!this.bootCompleted) return;

    // 조합 중인 텍스트를 임시로 표시
    const composingText = event.data || "";
    console.log("Composing:", composingText);

    // 조합 중인 텍스트로 화면 업데이트 (임시)
    this.updateInputWithComposition(composingText);
  }

  /**
   * IME(한글) 조합 완료
   */
  handleCompositionEnd(event) {
    if (!this.bootCompleted) return;

    this.isComposing = false;
    const finalText = event.data || "";

    console.log("Composition ended with:", finalText);

    // 최종 조합된 텍스트가 있을 때만 추가
    if (finalText && finalText.trim() !== "") {
      this.addComposedText(finalText);
    } else {
      // 조합이 취소된 경우 화면 정리
      this.updateInputDisplay();
    }
  }

  /**
   * 조합 중인 텍스트(한글)로 화면 업데이트
   */
  updateInputWithComposition(composingText) {
    if (!this.currentInput) return;

    // 기존 텍스트 + 조합 중인 텍스트를 임시로 표시
    const beforeCursor = this.currentInputText.substring(
      0,
      this.cursorPosition
    );
    const afterCursor = this.currentInputText.substring(this.cursorPosition);

    // 조합 중인 텍스트는 밑줄로 표시 (시각적 구분)
    if (this.currentFieldInfo?.sensitive) {
      // 패스워드 필드는 마스킹
      this.currentInput.textContent = "*".repeat(
        beforeCursor.length + composingText.length
      );
    } else {
      // 일반 필드는 조합 중인 텍스트 표시
      this.currentInput.innerHTML =
        beforeCursor +
        `<span style="text-decoration: underline;">${composingText}</span>` +
        afterCursor;
    }

    this.refreshCursor();
  }

  /**
   * 조합 완료된 텍스트(한글) 추가
   */
  addComposedText(finalText) {
    // 특별 모드에서는 전용 메서드 사용
    if (this.signupInProgress || this.loginInProgress || this.editInProgress) {
      this.addComposedTextInSpecialMode(finalText);
      return;
    }

    // 일반 모드에서는 커서 위치에 삽입
    const before = this.currentInputText.substring(0, this.cursorPosition);
    const after = this.currentInputText.substring(this.cursorPosition);

    this.currentInputText = before + finalText + after;
    this.cursorPosition += finalText.length; // 커서를 조합된 텍스트 길이만큼 이동

    this.updateInputDisplay();
  }

  /**
   * 특별 모드에서 조합된 텍스트(한글) 추가
   */
  addComposedTextInSpecialMode(finalText) {
    // 특별 모드에서는 항상 끝에 추가
    this.currentInputText += finalText;
    this.cursorPosition = this.currentInputText.length;

    // 민감한 필드면 마스킹 표시
    if (this.currentFieldInfo?.sensitive) {
      this.updateMaskedInputDisplay();
    } else {
      this.updateInputDisplay();
    }
  }

  /**
   * 키 입력 처리
   */
  handleKeyPress(event) {
    if (!this.bootCompleted) return;

    // IME 조합 중이면 대부분의 키 이벤트 무시
    if (this.isComposing) {
      // 조합 중에는 특수키(ESC, Ctrl+C 등)만 처리
      if (
        event.key === "Escape" ||
        (event.ctrlKey && event.key.toLowerCase() === "c")
      ) {
        // 조합 취소 및 특수키 처리
        this.isComposing = false;
        this.updateInputDisplay(); // 조합 중인 텍스트 제거
      }
      return; // 다른 키는 모두 무시
    }

    if (this.isKoreanInput(event)) {
      // 한글 입력이면 keydown 무시하고 composition 이벤트만 처리
      console.log("Korean input detected, waiting for composition");
      return;
    }

    // 기본 동작 방지
    event.preventDefault();

    // 기존 로직 계속...
    if (this.signupInProgress || this.loginInProgress || this.editInProgress) {
      this.handleSpecialModeKeyPress(event);
      return;
    }

    // 나머지 키 처리 로직...
    if (event.key === "Enter") {
      this.processCommand();
    } else if (event.key === "Backspace") {
      this.handleBackspace();
    } else if (event.key === "ArrowUp") {
      this.navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      this.navigateHistory(1);
    } else if (event.key === "ArrowLeft") {
      if (event.ctrlKey || event.metaKey) {
        this.moveCursorByWord("left");
      } else {
        this.moveCursorLeft();
      }
    } else if (event.key === "ArrowRight") {
      if (event.ctrlKey || event.metaKey) {
        this.moveCursorByWord("right");
      } else {
        this.moveCursorRight();
      }
    } else if (event.key === "Home") {
      this.moveCursorToStart();
    } else if (event.key === "End") {
      this.moveCursorToEnd();
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
      this.executeCommand("clear");
    } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
      this.handleCancel();
    } else if (event.key === "Tab") {
      this.handleTabCompletion();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      this.addCharacterToInput(event.key);
    }
  }

  /**
   * 커서 이동 메서드들
   */
  moveCursorLeft() {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
      this.updateInputDisplay();
    }
  }

  moveCursorRight() {
    if (this.cursorPosition < this.currentInputText.length) {
      this.cursorPosition++;
      this.updateInputDisplay();
    }
  }

  moveCursorToStart() {
    this.cursorPosition = 0;
    this.updateInputDisplay();
  }

  moveCursorToEnd() {
    this.cursorPosition = this.currentInputText.length;
    this.updateInputDisplay();
  }

  /**
   * 단어 단위 커서 이동
   */
  moveCursorByWord(direction) {
    const text = this.currentInputText;
    let newPosition = this.cursorPosition;

    if (direction === "left") {
      // 왼쪽으로 단어 단위 이동
      while (newPosition > 0 && text[newPosition - 1] === " ") {
        newPosition--; // 공백 건너뛰기
      }
      while (newPosition > 0 && text[newPosition - 1] !== " ") {
        newPosition--; // 단어 끝까지
      }
    } else if (direction === "right") {
      // 오른쪽으로 단어 단위 이동
      while (newPosition < text.length && text[newPosition] !== " ") {
        newPosition++; // 현재 단어 끝까지
      }
      while (newPosition < text.length && text[newPosition] === " ") {
        newPosition++; // 공백 건너뛰기
      }
    }

    this.cursorPosition = newPosition;
    this.updateInputDisplay();
  }

  /**
   * 브라우저 언어 감지 (영어 기본, 한국어만 특별 처리)
   */
  detectLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    // 한국어인 경우만 'ko', 나머지는 모두 'en' (기본값)
    return browserLang.startsWith("ko") ? "ko" : "en";
  }

  /**
   * API 헤더
   */
  getApiHeaders(includeContentType = true) {
    const headers = {
      "Accept-Language": this.currentLanguage,
    };

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  /**
   * 다국어 메시지 가져오기
   */
  getMessage(key, ...args) {
    const message =
      this.messages[this.currentLanguage][key] ||
      this.messages["en"][key] ||
      key;

    // 템플릿 변수 치환 (예: "Changing language to {0}")
    if (args.length > 0) {
      return message.replace(
        /\{(\d+)\}/g,
        (match, index) => args[index] || match
      );
    }

    return message;
  }

  /**
   * 명령어 처리
   */
  async processCommand() {
    const command = this.currentInputText.trim();

    // 명령어를 히스토리에 추가
    this.addCommandToHistory(command);

    if (command) {
      // 명령어 히스토리에 저장
      this.commandHistory.unshift(command);
      if (this.commandHistory.length > 100) {
        this.commandHistory.pop();
      }
    }

    this.historyIndex = -1;
    this.currentInputText = "";
    this.cursorPosition = 0; // 커서 위치 초기화
    this.updateInputDisplay();

    // 명령어 실행
    if (command) {
      await this.executeCommand(command);
    }
  }

  /**
   * 명령어 실행
   */
  async executeCommand(commandText) {
    const [commandName, ...args] = commandText.split(" ");
    const command = this.commands[commandName];

    if (command) {
      try {
        const result = await command.call(this, args);
        if (result) {
          this.addHistoryLine(result, "history-output");
        }
      } catch (error) {
        console.error(`Command execution failed: ${commandName}`, error);
        this.addHistoryLine(
          `Error executing command: ${error.message}`,
          "error-msg"
        );
      }
    } else {
      this.addHistoryLine(
        `${commandName}: ${this.getMessage("commandNotFound")}`,
        "error-msg"
      );
      this.addHistoryLine(this.getMessage("typeHelpForCommands"), "system-msg");
    }

    this.addHistoryLine("", ""); // 빈 줄 추가
  }

  /**
   * 사용 가능한 명령어들
   */
  commands = {
    // 베너 출력 명령어
    banner: function () {
      this.displayBanner();
      return null;
    },

    theme: function (args) {
      this.handleThemeCommand(args);
      return null;
    },

    // 화면 지우기 명령어
    clear: function () {
      this.clearTerminal();
      return null;
    },

    // 도움말 명령어
    help: function () {
      const commandList = Object.keys(this.commands).sort();
      const helpText = [
        this.getMessage("availableCommands"),
        "",
        ...commandList.map(
          (cmd) => `  ${cmd.padEnd(12)} - ${this.getCommandDescription(cmd)}`
        ),
        "",
        this.getMessage("terminalControls"),
        this.getMessage("commandCompletion"),
      ].join("\n");

      return helpText;
    },

    // 시스템 정보 명령어
    info: function () {
      this.displaySystemInfo();
      return null;
    },

    // 버전 정보 명령어
    version: function () {
      return `TISSUE Terminal v${this.systemInfo.version}`;
    },

    // 현재 시간 명령어
    date: function () {
      return new Date().toLocaleString();
    },

    // 에코 명령어
    echo: function (args) {
      return args.join(" ");
    },

    // 사용자 정보 명령어 (수정: 로그인 상태 반영)
    whoami: function () {
      if (this.isLoggedIn && this.currentUser) {
        return this.currentUser.username;
      }
      return "guest";
    },

    // 종료 명령어
    exit: function () {
      this.addHistoryLine(this.getMessage("goodbye"), "success-msg");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return null;
    },

    signup: function (args) {
      if (this.signupInProgress) {
        return `${this.getMessage("signupInProgress")} ${this.getMessage(
          "useCtrlCToCancel"
        )}`;
      }
      this.startSignupProcess();
      return null;
    },

    login: function (args) {
      if (this.loginInProgress) {
        return `${this.getMessage("loginInProgress")} ${this.getMessage(
          "useCtrlCToCancel"
        )}`;
      }
      this.startLoginProcess();
      return null;
    },

    logout: function (args) {
      if (!this.isLoggedIn) {
        return this.getMessage("notLoggedIn");
      }
      this.performLogout();
      return null;
    },

    profile: function (args) {
      if (!this.isLoggedIn) {
        return `${this.getMessage("pleaseLoginFirst")} to view your profile.`;
      }
      this.displayUserProfile();
      return null;
    },

    edit: function (args) {
      if (!this.isLoggedIn) {
        return `${this.getMessage("pleaseLoginFirst")} to edit your profile.`;
      }
      if (this.editInProgress) {
        return `${this.getMessage("editInProgress")} ${this.getMessage(
          "useCtrlCToCancel"
        )}`;
      }
      this.startEditProcess(args);
      return null;
    },

    status: function (args) {
      if (this.isLoggedIn) {
        return `${this.getMessage("loggedInAs")}: ${
          this.currentUser.username
        } (${this.currentUser.email})`;
      } else {
        return this.getMessage("notLoggedInGuest");
      }
    },

    lang: function (args) {
      const newLang = args[0];

      if (!newLang) {
        this.addHistoryLine(
          `${this.getMessage("currentLanguage")}: ${this.currentLanguage}`,
          "info-msg"
        );
        this.addHistoryLine(this.getMessage("languageUsage"), "system-msg");
        this.addHistoryLine("", "");
        return null;
      }

      if (newLang !== "ko" && newLang !== "en") {
        this.addHistoryLine(
          this.getMessage("unsupportedLanguage"),
          "error-msg"
        );
        this.addHistoryLine(
          this.getMessage("availableLanguages"),
          "system-msg"
        );
        this.addHistoryLine("", "");
        return null;
      }

      this.changeLanguage(newLang);
      return null;
    },
  };

  /**
   * 언어 변경 처리
   */
  async changeLanguage(newLang) {
    this.addHistoryLine(
      `${this.getMessage("changingLanguage")} ${newLang}`,
      "info-msg"
    );
    this.currentLanguage = newLang;
    this.addHistoryLine(this.getMessage("languageChanged"), "success-msg");
    this.addHistoryLine("", "");
  }

  /**
   * JobType 목록 조회
   */
  async loadJobTypes() {
    if (this.jobTypesLoaded && this.jobTypes) {
      return this.jobTypes;
    }

    try {
      const response = await fetch("/api/v1/jobtypes", {
        method: "GET",
        // credentials: "include",
        headers: this.getApiHeaders(false),
      });

      if (response.status === 200) {
        const result = await response.json();
        this.jobTypes = result.data;
        this.jobTypesLoaded = true;
        console.log("JobTypes loaded:", this.jobTypes);
        return this.jobTypes;
      } else {
        console.warn("Failed to load job types from API, using fallback");
        return this.getFallbackJobTypes();
      }
    } catch (error) {
      console.error("Error loading job types:", error);
      return this.getFallbackJobTypes();
    }
  }

  /**
   * 폴백 JobType 데이터 (네트워크 오류 시)
   */
  getFallbackJobTypes() {
    return [
      { code: "DEVELOPER", displayName: "Developer" },
      { code: "BACKEND_DEVELOPER", displayName: "Backend Developer" },
      { code: "FRONTEND_DEVELOPER", displayName: "Frontend Developer" },
      { code: "FULLSTACK_DEVELOPER", displayName: "Fullstack Developer" },
      { code: "MOBILE_DEVELOPER", displayName: "Mobile Developer" },
      { code: "BLOCKCHAIN_DEVELOPER", displayName: "Blockchain Developer" },
      { code: "GAME_DEVELOPER", displayName: "Game Developer" },
      { code: "SOFTWARE_ENGINEER", displayName: "Software Engineer" },
      { code: "DEVOPS_ENGINEER", displayName: "DevOps Engineer" },
      { code: "NETWORK_ENGINEER", displayName: "Network Engineer" },
      { code: "EMBEDDED_ENGINEER", displayName: "Embedded Engineer" },
      { code: "SECURITY_ENGINEER", displayName: "Security Engineer" },
      { code: "QA_ENGINEER", displayName: "QA Engineer" },
      { code: "AI_ENGINEER", displayName: "AI Engineer" },
      { code: "ML_ENGINEER", displayName: "Machine Learning Engineer" },
      { code: "MLOPS_ENGINEER", displayName: "MLOps Engineer" },
      { code: "DATA_ENGINEER", displayName: "Data Engineer" },
      { code: "DATA_SCIENTIST", displayName: "Data Scientist" },
      { code: "DATA_ANALYST", displayName: "Data Analyst" },
      { code: "BI_ANALYST", displayName: "BI Analyst" },
      { code: "RESEARCHER", displayName: "Researcher" },
      { code: "DESIGNER", displayName: "Designer" },
      { code: "UX_DESIGNER", displayName: "UX Designer" },
      { code: "UI_DESIGNER", displayName: "UI Designer" },
      { code: "GRAPHIC_DESIGNER", displayName: "Graphic Designer" },
      { code: "PRODUCT_MANAGER", displayName: "Product Manager" },
      { code: "PROJECT_MANAGER", displayName: "Project Manager" },
      { code: "ETC", displayName: "Other" },
    ];
  }

  /**
   * JobType 미리 로드
   */
  async preloadJobTypes() {
    try {
      await this.loadJobTypes();
      console.log("JobTypes preloaded successfully");
    } catch (error) {
      console.warn("JobTypes preload failed:", error);
    }
  }

  /**
   * 명령어 설명 반환
   */
  getCommandDescription(commandName) {
    const descriptions =
      this.messages[this.currentLanguage].commandDescriptions;
    return (
      descriptions[commandName] || this.getMessage("noDescriptionAvailable")
    );
  }

  /**
   * 베너 출력
   */
  displayBanner() {
    // ASCII 아트 베너
    const bannerAscii = `████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
   ██╗███████╗███████╗██╗   ██╗███████╗
   ██║██╔════╝██╔════╝██║   ██║██╔════╝
   ██║███████╗███████╗██║   ██║█████╗
   ██║╚════██║╚════██║██║   ██║██╔══╝
   ██║███████║███████║╚██████╔╝███████╗
   ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚══════╝`;

    // 베너 컨테이너 생성
    const bannerContainer = document.createElement("div");
    bannerContainer.className = "banner-container";

    // ASCII 아트 요소
    const bannerElement = document.createElement("pre");
    bannerElement.className = "ascii-banner";
    bannerElement.textContent = bannerAscii;

    // 버전 정보 요소
    const versionElement = document.createElement("span");
    versionElement.className = "version-info";
    versionElement.textContent = ` ver${this.systemInfo.version}`;

    // 베너 요소들을 컨테이너에 추가
    bannerContainer.appendChild(bannerElement);
    bannerContainer.appendChild(versionElement);

    // 터미널 히스토리에 추가
    this.terminalHistory.appendChild(bannerContainer);

    // 시스템 정보 출력
    this.displaySystemInfo();

    // 텍스트를 여러 부분으로 나누어서 처리
    const helpLine = document.createElement("div");
    helpLine.className = "help-msg";
    helpLine.innerHTML = this.getMessage("typeHelpToSeeCommands");
    this.terminalHistory.appendChild(helpLine);

    this.addHistoryLine("", "");
    this.addHistoryLine("\n", "");

    this.scrollToBottom();
  }

  /**
   * 시스템 정보 출력
   */
  displaySystemInfo() {
    const infoContainer = document.createElement("div");
    infoContainer.className = "system-info-container";

    // 제목
    const title = document.createElement("div");
    title.className = "system-info-title";
    title.textContent = this.getMessage("systemTitle");
    infoContainer.appendChild(title);

    // 빈 줄
    const emptyLine = document.createElement("div");
    emptyLine.className = "system-info-line";
    emptyLine.innerHTML = "&nbsp;";
    infoContainer.appendChild(emptyLine);

    // 시스템 정보 항목들
    const infoItems = [
      {
        label: this.getMessage("repository"),
        value: this.systemInfo.repository,
      },
      {
        label: this.getMessage("author"),
        value: `${this.systemInfo.author} <${this.systemInfo.email}>`,
      },
      { label: this.getMessage("license"), value: this.systemInfo.license },
      {
        label: this.getMessage("documentation"),
        value: this.systemInfo.documentation,
      },
    ];

    infoItems.forEach((item) => {
      const line = document.createElement("div");
      line.className = "system-info-line";

      const label = document.createElement("span");
      label.className = "info-label";
      label.textContent = item.label;

      const value = document.createElement("span");
      value.className = "info-value";
      value.textContent = item.value;

      line.appendChild(label);
      line.appendChild(value);
      infoContainer.appendChild(line);
    });

    this.terminalHistory.appendChild(infoContainer);
    this.scrollToBottom();
  }

  /**
   * 문자열의 실제 표시 길이 계산 (유니코드 문자 고려)
   */
  getDisplayLength(str) {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = char.charCodeAt(0);

      // 한글, 중국어, 일본어 등 전각 문자는 2자리
      if (
        (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
        (code >= 0x3040 && code <= 0x309f) || // 히라가나
        (code >= 0x30a0 && code <= 0x30ff) || // 가타카나
        (code >= 0x3130 && code <= 0x318f) || // 한글 호환 자모
        (code >= 0xac00 && code <= 0xd7af) || // 한글 음절
        (code >= 0x4e00 && code <= 0x9fff) || // CJK 한자
        (code >= 0xff00 && code <= 0xffef) // 전각 형태
      ) {
        length += 2;
      } else {
        length += 1;
      }
    }
    return length;
  }

  /**
   * 터미널 화면 지우기
   */
  clearTerminal() {
    if (this.terminalHistory) {
      this.terminalHistory.innerHTML = "";
    }
  }

  /**
   * 명령어를 히스토리에 추가
   */
  addCommandToHistory(command) {
    const line = document.createElement("div");
    line.className = "history-line";

    const prompt = document.createElement("span");
    prompt.className = "history-prompt";
    prompt.textContent = this.promptPrefix;

    const commandSpan = document.createElement("span");
    commandSpan.className = "history-command";
    commandSpan.textContent = command;

    line.appendChild(prompt);
    line.appendChild(commandSpan);

    this.terminalHistory.appendChild(line);
    this.scrollToBottom();
  }

  /**
   * 히스토리 라인 추가
   */
  addHistoryLine(text, className = "history-output") {
    if (!this.terminalHistory) return;

    const line = document.createElement("div");
    line.className = `history-line ${className}`;
    line.textContent = text;

    this.terminalHistory.appendChild(line);
    this.scrollToBottom();
  }

  /**
   * 입력에 문자 추가(커서 위치 고려)
   */
  addCharacterToInput(char) {
    // this.currentInputText += char;
    // this.updateInputDisplay();

    // 커서 위치에 문자 삽입
    const before = this.currentInputText.substring(0, this.cursorPosition);
    const after = this.currentInputText.substring(this.cursorPosition);

    this.currentInputText = before + char + after;
    this.cursorPosition++; // 커서를 한 칸 앞으로

    this.updateInputDisplay();
  }

  /**
   * 백스페이스 처리(커서 위치 고려)
   */
  handleBackspace() {
    // if (this.currentInputText.length > 0) {
    //   this.currentInputText = this.currentInputText.slice(0, -1);
    //   this.updateInputDisplay();
    // }

    if (this.cursorPosition > 0) {
      const before = this.currentInputText.substring(
        0,
        this.cursorPosition - 1
      );
      const after = this.currentInputText.substring(this.cursorPosition);

      this.currentInputText = before + after;
      this.cursorPosition--; // 커서를 한 칸 뒤로

      this.updateInputDisplay();
    }
  }

  /**
   * Delete 키 처리
   */
  handleDelete() {
    if (this.cursorPosition < this.currentInputText.length) {
      const before = this.currentInputText.substring(0, this.cursorPosition);
      const after = this.currentInputText.substring(this.cursorPosition + 1);

      this.currentInputText = before + after;
      // 커서 위치는 그대로 유지

      this.updateInputDisplay();
    }
  }

  /**
   * 명령어 히스토리 탐색 (히스토리 탐색 시 커서를 끝으로 이동)
   */
  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;

    if (this.historyIndex < -1) {
      this.historyIndex = -1;
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length - 1;
    }

    if (this.historyIndex === -1) {
      this.currentInputText = "";
    } else {
      this.currentInputText = this.commandHistory[this.historyIndex];
    }

    // 커서를 텍스트 끝으로 이동
    this.cursorPosition = this.currentInputText.length;
    this.updateInputDisplay();
  }

  /**
   * 탭 완성
   */
  handleTabCompletion() {
    const input = this.currentInputText.trim();
    if (!input) return;

    // theme 명령어의 하위 완성
    if (input.startsWith("theme ")) {
      const themeInput = input.substring(6); // 'theme ' 이후 부분
      const themeNames = Object.keys(this.availableThemes);
      const matches = themeNames.filter((theme) =>
        theme.startsWith(themeInput)
      );

      if (matches.length === 1) {
        this.currentInputText = `theme ${matches[0]}`;
        this.cursorPosition = this.currentInputText.length;
        this.updateInputDisplay();
      } else if (matches.length > 1) {
        this.addHistoryLine("", "");

        this.addHistoryLine(this.getMessage("themeListTitle"), "info-msg");
        this.addHistoryLine(matches.join("  "), "system-msg");
        this.addHistoryLine("", "");
      }
      return;
    }

    // 일반 명령어 완성
    const commands = Object.keys(this.commands);
    const matches = commands.filter((cmd) => cmd.startsWith(input));

    if (matches.length === 1) {
      this.currentInputText = matches[0] + " ";
      this.cursorPosition = this.currentInputText.length;
      this.updateInputDisplay();
    } else if (matches.length > 1) {
      this.addHistoryLine("", "");

      this.addHistoryLine(
        this.getMessage("tabCompletionAvailable"),
        "info-msg"
      );
      this.addHistoryLine(matches.join("  "), "system-msg");
      this.addHistoryLine("", "");
    }
  }

  /**
   * 취소 처리 (Ctrl+C)
   */
  handleCancel() {
    if (this.currentInputText) {
      this.addCommandToHistory(this.currentInputText + "^C");
      this.currentInputText = "";
      this.cursorPosition = 0; // 커서 위치 초기화
      this.updateInputDisplay();
    }
  }

  /**
   * 입력 표시 업데이트(커서 위치 반영)
   */
  updateInputDisplay() {
    if (!this.currentInput) return;

    // 특별 모드 마스킹 처리
    if (
      (this.signupInProgress || this.loginInProgress || this.editInProgress) &&
      this.currentFieldInfo?.sensitive
    ) {
      this.updateMaskedInputDisplay();
      return; // 여기서 리턴해서 아래 로직 실행 안함
    }

    const beforeCursor = this.currentInputText.substring(
      0,
      this.cursorPosition
    );
    const afterCursor = this.currentInputText.substring(this.cursorPosition);

    // 현재 입력 영역에 커서 앞 텍스트만 표시
    this.currentInput.textContent = beforeCursor;

    // 기존 커서 요소 찾기
    if (this.terminalCursor) {
      // 커서 뒤에 숨겨진 텍스트가 있다면 data 속성으로 저장 (화면엔 안 보임)
      this.terminalCursor.setAttribute("data-after-text", afterCursor);
    }

    this.refreshCursor();
  }

  /**
   * 패스워드 필드용 마스킹된 입력 표시 업데이트
   */
  updateMaskedInputDisplay() {
    if (!this.currentInput) return;

    // 커서 위치 검증 및 보정
    if (this.cursorPosition > this.currentInputText.length) {
      this.cursorPosition = this.currentInputText.length;
    }
    if (this.cursorPosition < 0) {
      this.cursorPosition = 0;
    }

    // 커서 앞부분만 마스킹해서 표시
    const beforeCursor = "*".repeat(this.cursorPosition);
    this.currentInput.textContent = beforeCursor;

    // 커서 뒤 텍스트 정보 저장 (안전하게 처리)
    const afterCursorLength = Math.max(
      0,
      this.currentInputText.length - this.cursorPosition
    );
    const afterMasked = "*".repeat(afterCursorLength);

    if (this.terminalCursor) {
      this.terminalCursor.setAttribute("data-after-text", afterMasked);
    }

    this.refreshCursor();
  }

  /**
   * 특별 모드용 문자 입력 (커서 위치 관리)
   */
  addCharacterToInputInSpecialMode(char) {
    // 특별 모드에서는 항상 끝에 추가 (커서도 끝으로)
    this.currentInputText += char;
    this.cursorPosition = this.currentInputText.length;

    // 민감한 필드면 마스킹 표시
    if (this.currentFieldInfo?.sensitive) {
      this.updateMaskedInputDisplay();
    } else {
      this.updateInputDisplay();
    }
  }

  /**
   * 특별 모드용 백스페이스 메서드
   */
  handleBackspaceInSpecialMode() {
    if (this.currentInputText.length > 0) {
      this.currentInputText = this.currentInputText.slice(0, -1);
      this.cursorPosition = this.currentInputText.length; // 커서를 끝으로

      // 민감한 필드면 마스킹 표시
      if (this.currentFieldInfo?.sensitive) {
        this.updateMaskedInputDisplay();
      } else {
        this.updateInputDisplay();
      }
    }
  }

  /**
   * 명령어 입력 초기화 시 커서 위치도 초기화
   */
  resetCurrentInput() {
    this.currentInputText = "";
    this.cursorPosition = 0; // 커서 위치 초기화
    this.updateInputDisplay();
  }

  /**
   * 커서 새로고침
   */
  refreshCursor() {
    if (this.terminalCursor) {
      // 커서 뒤 텍스트가 있으면 커서 다음에 표시
      const afterText =
        this.terminalCursor.getAttribute("data-after-text") || "";

      // 기존 커서 다음 형제 요소들 제거 (afterText 전용)
      let nextSibling = this.terminalCursor.nextSibling;
      while (nextSibling) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextSibling;
        if (toRemove.className === "after-cursor-text") {
          toRemove.remove();
        }
      }

      // 커서 뒤 텍스트가 있으면 추가
      if (afterText) {
        const afterSpan = document.createElement("span");
        afterSpan.className = "after-cursor-text";
        afterSpan.textContent = afterText;
        afterSpan.style.color = "#ffffff"; // 일반 텍스트 색상

        // 커서 바로 다음에 삽입
        this.terminalCursor.parentNode.insertBefore(
          afterSpan,
          this.terminalCursor.nextSibling
        );
      }

      // 기존 깜빡임 효과 유지
      this.terminalCursor.style.animation = "none";
      this.terminalCursor.offsetHeight; // 강제 리플로우
      this.terminalCursor.style.animation =
        "terminalBlink 1s step-start infinite";
    }
  }

  /**
   * 화면 스크롤을 아래로
   */
  scrollToBottom() {
    if (this.terminalScreen) {
      this.terminalScreen.scrollTop = this.terminalScreen.scrollHeight;
    }
  }

  /**
   * 포커스 유지
   */
  maintainFocus() {
    if (this.focusKeeper && document.activeElement !== this.focusKeeper) {
      try {
        this.focusKeeper.focus();
      } catch (error) {
        console.warn("Focus maintenance failed:", error);
      }
    }
  }

  /**
   * 붙여넣기 처리
   */
  handlePaste(event) {
    if (!this.bootCompleted) return;

    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");

    // 여러 줄 텍스트는 첫 번째 줄만 사용
    const singleLineText = pastedText.split("\n")[0];

    this.currentInputText += singleLineText;
    this.updateInputDisplay();
  }

  /**
   * 치명적 에러 표시
   */
  showCriticalError(message) {
    document.body.innerHTML = `
           <div style="background: #000; color: #ff0000; font-family: monospace; padding: 20px; height: 100vh;">
               <h1>TISSUE Terminal - Critical Error</h1>
               <p>${message}</p>
               <p>Please refresh the page or contact support.</p>
           </div>
       `;
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    console.log("TISSUE Terminal: Cleaning up...");
    this.isDestroyed = true;

    // 이메일 폴링 정리
    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
      this.emailPollingInterval = null;
    }
  }

  // ========== 회원가입 관련 메서드들 ==========

  /**
   * 회원가입 필드 정의
   */
  getSignupFields() {
    return [
      {
        name: "loginId",
        prompt: this.getMessage("loginIdPrompt"),
        description: this.getMessage("loginIdDesc"),
        required: true,
        validation: this.validateLoginId.bind(this),
      },
      {
        name: "email",
        prompt: this.getMessage("emailPrompt"),
        description: this.getMessage("emailDesc"),
        required: true,
        validation: this.validateEmail.bind(this),
        needsVerification: true,
      },
      {
        name: "username",
        prompt: this.getMessage("usernamePrompt"),
        description: this.getMessage("usernameDesc"),
        required: true,
        validation: this.validateUsername.bind(this),
      },
      {
        name: "password",
        prompt: this.getMessage("passwordPrompt"),
        description: this.getMessage("passwordDesc"),
        required: true,
        sensitive: true,
        validation: this.validatePassword.bind(this),
      },
      {
        name: "confirmPassword",
        prompt: this.getMessage("confirmPasswordPrompt"),
        description: this.getMessage("confirmPasswordDesc"),
        required: true,
        sensitive: true,
        validation: this.validatePasswordConfirm.bind(this),
      },
      {
        name: "name",
        prompt: this.getMessage("namePrompt"),
        description: this.getMessage("nameDesc"),
        required: false,
        validation: this.validateName.bind(this),
      },
      {
        name: "birthDate",
        prompt: this.getMessage("birthDatePrompt"),
        description: this.getMessage("birthDateDesc"),
        required: false,
        validation: this.validateBirthDate.bind(this),
      },
      {
        name: "jobType",
        prompt: this.getMessage("jobTypePrompt"),
        description: this.getMessage("jobTypeDesc"),
        required: false,
        validation: this.validateJobType.bind(this),
      },
    ];
  }

  /**
   * 회원가입 프로세스 시작
   */
  startSignupProcess() {
    this.signupInProgress = true;
    this.signupStep = 0;
    this.signupData = {};

    this.addHistoryLine("\n", "");
    this.addHistoryLine("=".repeat(50), "info-msg");
    this.addHistoryLine(
      `           ${this.getMessage("registrationWizard")}`,
      "success-msg"
    );
    this.addHistoryLine("=".repeat(50), "info-msg");
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("welcomeRegistration"), "system-msg");
    this.addHistoryLine(this.getMessage("canCancelAnytime"), "system-msg");
    this.addHistoryLine(this.getMessage("optionalFieldsSkip"), "system-msg");
    this.addHistoryLine("", "");
    this.addHistoryLine("\n", "");

    setTimeout(() => this.promptNextField(), 300);
  }

  /**
   * 다음 필드 입력 요청
   */
  promptNextField() {
    const fields = this.getSignupFields();

    if (this.signupStep >= fields.length) {
      this.completeSignupProcess();
      return;
    }

    const field = fields[this.signupStep];
    this.currentFieldInfo = field;

    this.currentInputText = "";
    this.cursorPosition = 0;
    this.updateInputDisplay();

    // 진행률 표시
    const progress = Math.round((this.signupStep / fields.length) * 100);
    const progressBar =
      "▓".repeat(Math.floor(progress / 5)) +
      "░".repeat(20 - Math.floor(progress / 5));

    this.addHistoryLine(`[${progress}%] ${progressBar}`, "info-msg");
    this.addHistoryLine("", "");

    // 필드 정보 표시
    const requiredText = field.required
      ? " *"
      : ` ${this.getMessage("optional")}`;
    this.addHistoryLine(
      `${this.getMessage("stepProgress")} ${this.signupStep + 1}/${
        fields.length
      }: ${field.prompt}${requiredText}`,
      "success-msg"
    );
    this.addHistoryLine(`${field.description}`, "system-msg");

    if (!field.required) {
      this.addHistoryLine(this.getMessage("skipEmptyInput"), "system-msg");
    }

    this.addHistoryLine("", "");

    // 특별한 경우 처리
    if (
      field.name === "email" &&
      this.emailVerificationStatus === "verified" &&
      this.signupData.email
    ) {
      this.addHistoryLine(
        `${this.getMessage("emailAlreadyVerified")}: ${this.signupData.email}`,
        "success-msg"
      );
      this.addHistoryLine("", "");
      this.signupStep++;
      setTimeout(() => this.promptNextField(), 300);
      return;
    }

    // Job Type 필드의 경우 선택 옵션 표시
    if (field.name === "jobType") {
      this.showJobTypeOptions();
    }

    // 프롬프트 업데이트
    this.updatePromptForSignup(field);
  }

  /**
   * 회원가입용 프롬프트 업데이트
   */
  updatePromptForSignup(field) {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = `${field.prompt}: `;
      // promptElement.style.color = "#FFD93D"; // --signup-prompt 사용, 노란색 계통으로 css에 정의해서 사용하면 좋을듯
    }
  }

  /**
   * 회원가입 중 키 입력 처리
   */

  handleSignupKeyPress(event) {
    const field = this.currentFieldInfo;
    if (!field) return;

    // JobType 선택 모드일 때 화살표 처리
    if (field.name === "jobType" && this.jobTypeSelectionMode) {
      if (event.key === "ArrowUp") {
        this.handleJobTypeNavigation("up");
        return;
      } else if (event.key === "ArrowDown") {
        this.handleJobTypeNavigation("down");
        return;
      } else if (event.key === "Enter") {
        if (this.selectCurrentJobType()) {
          return; // 선택 완료됨
        }
        // 선택된 항목이 없으면 일반 Enter 처리로 진행
      } else if (event.key === "Escape") {
        // this.exitJobTypeSelectionMode();
        this.resetJobTypeSelectionState();
        return;
      } else if (event.key.length === 1) {
        // 문자 입력 시 선택 모드 종료하고 직접 입력 모드로
        // this.exitJobTypeSelectionMode();
        this.resetJobTypeSelectionState();
        this.addCharacterToInputInSpecialMode(event.key);
        return;
      }
    }

    if (event.key === "Enter") {
      this.processSignupInput();
    } else if (event.key === "Backspace") {
      // JobType 선택 모드 종료
      if (field.name === "jobType" && this.jobTypeSelectionMode) {
        // this.exitJobTypeSelectionMode();
        this.resetJobTypeSelectionState();
      }

      this.handleBackspaceInSpecialMode();
    } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
      this.cancelSignupProcess();
    } else if (event.key === "Tab" && field.name === "jobType") {
      this.showJobTypeOptions();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      // JobType 선택 모드면 종료하고 직접 입력
      if (field.name === "jobType" && this.jobTypeSelectionMode) {
        // this.exitJobTypeSelectionMode();
        this.resetJobTypeSelectionState();
      }

      this.addCharacterToInputInSpecialMode(event.key);
    }
  }

  /**
   * 회원가입 입력 처리
   */
  async processSignupInput() {
    const field = this.currentFieldInfo;
    const value = this.currentInputText.trim();

    // 입력 내용을 히스토리에 표시
    const displayValue = field.sensitive
      ? "*".repeat(this.currentInputText.length)
      : this.currentInputText;
    this.addCommandToSignupHistory(field.prompt + ": " + displayValue);

    // 필수 필드 검증
    if (field.required && !value) {
      this.addHistoryLine(this.getMessage("required"), "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    // 선택 필드이고 빈 값이면 스킵
    if (!field.required && !value) {
      this.addHistoryLine(this.getMessage("skipped"), "warning-msg");
      this.addHistoryLine("", "");
      this.nextSignupStep();
      return;
    }

    // 필드별 검증 실행
    try {
      const isValid = await field.validation(value);
      if (!isValid.valid) {
        this.addHistoryLine(`✗ ${isValid.error}`, "error-msg");
        this.addHistoryLine("", "");
        this.currentInputText = "";
        this.updateInputDisplay();
        return;
      }

      // 값 저장
      this.signupData[field.name] = value;

      // 성공 메시지
      const successValue = field.sensitive ? "[HIDDEN]" : value;
      this.addHistoryLine(`✓ ${field.name}: ${successValue}`, "success-msg");

      // 이메일 필드의 경우 인증 프로세스 시작
      if (field.needsVerification) {
        await this.handleEmailVerificationInSignup(value);
      } else {
        this.addHistoryLine("", "");
        this.nextSignupStep();
      }
    } catch (error) {
      this.addHistoryLine(`✗ Validation error: ${error.message}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
    }
  }

  /**
   * 다음 회원가입 단계로 이동
   */
  nextSignupStep() {
    this.signupStep++;
    this.currentInputText = "";
    this.updateInputDisplay();
    this.resetPromptAfterSignup();
    setTimeout(() => this.promptNextField(), 300);
  }

  /**
   * 회원가입 중 이메일 인증 처리
   */
  async handleEmailVerificationInSignup(email) {
    this.addHistoryLine("", "");
    this.addHistoryLine(
      this.getMessage("sendingVerificationEmail"),
      "info-msg"
    );

    try {
      const response = await fetch(
        "/api/v1/members/email-verification/request",
        {
          method: "POST",
          headers: this.getApiHeaders(),
          body: JSON.stringify({ email: email }),
        }
      );

      if (response.ok) {
        this.addHistoryLine(
          this.getMessage("verificationEmailSent"),
          "success-msg"
        );
        this.addHistoryLine("", "");
        this.addHistoryLine(
          this.getMessage("waitingEmailVerification"),
          "warning-msg"
        );
        this.addHistoryLine(
          `   ${this.getMessage("checkEmailAndClick")}`,
          "system-msg"
        );
        this.addHistoryLine(
          `   ${this.getMessage("processWillContinue")}`,
          "system-msg"
        );
        this.addHistoryLine("", "");

        this.startEmailPollingForSignup(email);
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message || this.getMessage("failedToSendEmail");
        this.addHistoryLine(`✗ ${errorMessage}`, "error-msg");
        this.addHistoryLine("", "");
        this.currentInputText = "";
        this.updateInputDisplay();
      }
    } catch (error) {
      console.error("Email verification request failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
    }
  }

  /**
   * 회원가입 중 이메일 인증 폴링
   */
  startEmailPollingForSignup(email) {
    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
    }

    let attempts = 0;
    const maxAttempts = 300; // 5분

    this.emailPollingInterval = setInterval(async () => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(this.emailPollingInterval);
        this.addHistoryLine(
          this.getMessage("emailVerificationTimeout"),
          "warning-msg"
        );
        this.addHistoryLine(
          `   ${this.getMessage("tryAgainOrContact")}`,
          "system-msg"
        );
        this.addHistoryLine("", "");
        return;
      }

      try {
        const response = await fetch(
          `/api/v1/members/email-verification/status?email=${encodeURIComponent(
            email
          )}`,
          {
            headers: this.getApiHeaders(false),
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.data === true) {
            clearInterval(this.emailPollingInterval);
            this.emailVerificationStatus = "verified";

            this.addHistoryLine(
              this.getMessage("emailVerifiedSuccessfully"),
              "success-msg"
            );
            this.addHistoryLine("", "");

            this.nextSignupStep();
          }
        }
      } catch (error) {
        console.error("Email verification polling error:", error);
      }
    }, 1000);
  }

  /**
   * 회원가입 프로세스 완료
   */
  async completeSignupProcess() {
    this.addHistoryLine("\n", "");
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("processingRegistration"), "info-msg");
    this.addHistoryLine(
      `   ${this.getMessage("creatingAccount")}`,
      "system-msg"
    );
    this.addHistoryLine("", "");

    try {
      const signupData = this.prepareSignupData();

      const response = await fetch("/api/v1/members", {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify(signupData),
      });

      if (response.ok) {
        const result = await response.json();

        const memberData = {
          username: this.signupData.username,
          email: this.signupData.email,
          loginId: this.signupData.loginId,
        };

        await this.displaySuccessMessage(memberData);

        this.resetSignupState();
      } else {
        const errorData = await response.json().catch(() => null);
        this.handleSignupError(errorData);
      }
    } catch (error) {
      console.error("Signup request failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine(
        `   ${this.getMessage("checkConnection")}`,
        "system-msg"
      );
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");
      this.resetSignupState();
    }
  }

  /**
   * 회원가입 데이터 준비
   */
  prepareSignupData() {
    const { confirmPassword, ...dataToSend } = this.signupData;

    return {
      loginId: dataToSend.loginId,
      email: dataToSend.email,
      username: dataToSend.username,
      password: dataToSend.password,
      name: dataToSend.name || "",
      birthDate: dataToSend.birthDate || null,
      jobType: dataToSend.jobType || "ETC",
    };
  }

  /**
   * 성공 메시지 표시
   */
  async displaySuccessMessage(memberData) {
    await this.typeMessage(
      this.getMessage("registrationComplete"),
      "success-msg"
    );
    this.addHistoryLine("\n", "");
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("welcomeToTissue"), "success-msg");
    this.addHistoryLine(
      `   ${this.getMessage("username")}: ${memberData.username}`,
      "info-msg"
    );
    this.addHistoryLine(
      `   ${this.getMessage("loginId")}: ${memberData.loginId}`,
      "info-msg"
    );
    this.addHistoryLine(
      `   ${this.getMessage("email")}: ${memberData.email}`,
      "info-msg"
    );
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("canNowLogin"), "system-msg");
    this.addHistoryLine("", "");
    this.addHistoryLine("\n", "");
  }

  /**
   * 회원가입 상태 초기화
   */
  resetSignupState() {
    this.signupInProgress = false;
    this.signupStep = 0;
    this.signupData = {};
    this.currentFieldInfo = null;
    this.emailVerificationStatus = "none";

    // JobType 선택 모드 정리
    // this.exitJobTypeSelectionMode();

    // JobType 상태 초기화
    this.resetJobTypeSelectionState();

    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
      this.emailPollingInterval = null;
    }

    this.resetPromptAfterSignup();
  }

  /**
   * 프롬프트를 기본 상태로 복원
   */
  resetPromptAfterSignup() {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = this.promptPrefix;
      // promptElement.style.color = "#00AAFF";
    }

    this.currentInputText = "";
    this.cursorPosition = 0; // 커서 위치 초기화
    this.updateInputDisplay();
  }

  /**
   * 회원가입 취소 처리
   */
  cancelSignupProcess() {
    this.addHistoryLine("", "");
    this.addHistoryLine("^C", "system-msg");
    this.addHistoryLine(
      this.getMessage("registrationCancelled"),
      "warning-msg"
    );
    this.addHistoryLine("", "");
    this.resetSignupState();
  }

  /**
   * 회원가입 명령어를 히스토리에 추가
   */
  addCommandToSignupHistory(command) {
    const line = document.createElement("div");
    line.className = "history-line";

    const prompt = document.createElement("span");
    prompt.className = "history-prompt";
    prompt.textContent = this.currentFieldInfo.prompt + ": ";
    // prompt.style.color = "#FFD93D";

    const commandSpan = document.createElement("span");
    commandSpan.className = "history-command";
    commandSpan.textContent = command.split(": ")[1] || "";

    line.appendChild(prompt);
    line.appendChild(commandSpan);

    this.terminalHistory.appendChild(line);
    this.scrollToBottom();
  }

  /**
   * 타이핑 효과로 메시지 출력
   */
  async typeMessage(text, className = "history-output", speed = 50) {
    const line = document.createElement("div");
    line.className = `history-line ${className}`;
    this.terminalHistory.appendChild(line);

    for (let i = 0; i <= text.length; i++) {
      line.textContent = text.substring(0, i);
      this.scrollToBottom();
      await new Promise((resolve) => setTimeout(resolve, speed));
    }
  }

  /**
   * 회원가입 에러 처리
   */
  handleSignupError(errorData) {
    this.addHistoryLine(this.getMessage("registrationFailed"), "error-msg");

    if (errorData && errorData.message) {
      this.addHistoryLine(`   ${errorData.message}`, "error-msg");
    } else {
      this.addHistoryLine(
        `   ${this.getMessage("unexpectedError")}`,
        "error-msg"
      );
    }

    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("trySignupAgain"), "system-msg");
    this.addHistoryLine("", "");
    this.addHistoryLine("\n", "");

    this.resetSignupState();
  }

  // ========== 검증 함수들 ==========

  /**
   * Login ID 검증
   */
  async validateLoginId(value) {
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(value)) {
      return {
        valid: false,
        error: this.getMessage("loginIdValidation"),
      };
    }

    try {
      const response = await fetch(
        `/api/v1/members/check-loginid?loginId=${encodeURIComponent(value)}`,
        {
          headers: this.getApiHeaders(false),
        }
      );

      if (response.status === 200) {
        return { valid: true };
      } else if (response.status === 409) {
        const result = await response.json();
        return {
          valid: false,
          error: result.message || this.getMessage("loginIdTaken"),
        };
      } else {
        return {
          valid: false,
          error: this.getMessage("unableToVerifyLoginId"),
        };
      }
    } catch (error) {
      console.warn("Failed to check Login ID availability:", error);
      return {
        valid: false,
        error: this.getMessage("networkError"),
      };
    }
  }

  /**
   * 이메일 검증
   */
  async validateEmail(value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return {
        valid: false,
        error: this.getMessage("enterValidEmail"),
      };
    }

    try {
      const response = await fetch(
        `/api/v1/members/check-email?email=${encodeURIComponent(value)}`,
        {
          headers: this.getApiHeaders(false),
        }
      );

      if (response.status === 200) {
        return { valid: true };
      } else if (response.status === 409) {
        const result = await response.json();
        return {
          valid: false,
          error: result.message || this.getMessage("emailAlreadyRegistered"),
        };
      } else {
        return {
          valid: false,
          error: this.getMessage("unableToVerifyEmail"),
        };
      }
    } catch (error) {
      console.warn("Failed to check email availability:", error);
      return {
        valid: false,
        error: this.getMessage("networkError"),
      };
    }
  }

  /**
   * 패스워드 검증
   */
  async validatePassword(value) {
    if (value.length < 8) {
      return {
        valid: false,
        error: this.getMessage("passwordMinLength"),
      };
    }

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (!hasLetter || !hasNumber || !hasSymbol) {
      return {
        valid: false,
        error: this.getMessage("passwordRequirements"),
      };
    }

    return { valid: true };
  }

  /**
   * 패스워드 확인 검증
   */
  async validatePasswordConfirm(value) {
    if (value !== this.signupData.password) {
      return {
        valid: false,
        error: this.getMessage("passwordsDoNotMatch"),
      };
    }
    return { valid: true };
  }

  /**
   * 사용자명 검증
   */
  async validateUsername(value) {
    if (value.length < 4 || value.length > 20) {
      return {
        valid: false,
        error: this.getMessage("usernameLength"),
      };
    }

    if (!/^[\p{L}][\p{L}\p{N}]*$/u.test(value)) {
      return {
        valid: false,
        error: this.getMessage("usernameFormat"),
      };
    }

    try {
      const response = await fetch(
        `/api/v1/members/check-username?username=${encodeURIComponent(value)}`,
        {
          headers: this.getApiHeaders(false),
        }
      );

      if (response.status === 200) {
        return { valid: true };
      } else if (response.status === 409) {
        const result = await response.json();
        return {
          valid: false,
          error: result.message || this.getMessage("usernameTaken"),
        };
      } else {
        return {
          valid: false,
          error: this.getMessage("unableToVerifyUsername"),
        };
      }
    } catch (error) {
      console.warn("Failed to check username availability:", error);
      return {
        valid: false,
        error: this.getMessage("networkError"),
      };
    }
  }

  /**
   * 이름 검증
   */
  async validateName(value) {
    if (value.length > 50) {
      return {
        valid: false,
        error: this.getMessage("nameLength"),
      };
    }

    if (!/^[\p{L}]+( [\p{L}]+)*$/u.test(value)) {
      return {
        valid: false,
        error: this.getMessage("nameInvalidChars"),
      };
    }

    return { valid: true };
  }
  /**
   * 생년월일 검증
   */
  async validateBirthDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return {
        valid: false,
        error: this.getMessage("birthDateFormat"),
      };
    }

    const date = new Date(value);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return {
        valid: false,
        error: this.getMessage("invalidDate"),
      };
    }

    if (date > now) {
      return {
        valid: false,
        error: this.getMessage("birthDateFuture"),
      };
    }

    const minDate = new Date(
      now.getFullYear() - 150,
      now.getMonth(),
      now.getDate()
    );
    if (date < minDate) {
      return {
        valid: false,
        error: this.getMessage("enterValidBirthDate"),
      };
    }

    return { valid: true };
  }

  /**
   * 직업 유형 검증
   */
  async validateJobType(value) {
    // 화살표 선택 모드에서는 별도 처리
    if (this.jobTypeSelectionMode) {
      return { valid: true };
    }

    if (value.toLowerCase() === "list") {
      await this.showJobTypeOptions();
      return {
        valid: false,
        error: this.getMessage("selectFromOptionsAbove"),
      };
    }

    // 자동 capitalize 적용
    const capitalizedValue = this.capitalize(value);

    // JobType 옵션들과 매칭 확인
    const jobTypes = await this.loadJobTypes();

    const matchedJobType = jobTypes.find((jt) => {
      // 안전한 속성 접근
      const displayName = jt.displayName || "";
      const code = jt.code || "";

      return (
        displayName.toLowerCase() === capitalizedValue.toLowerCase() ||
        code.toLowerCase() === capitalizedValue.toLowerCase()
      );
    });

    if (matchedJobType) {
      // 매칭되면 정확한 code 값으로 저장
      if (this.signupInProgress) {
        this.signupData.jobType = matchedJobType.code;
      } else if (this.editInProgress) {
        this.editData.jobTypeValue = matchedJobType.code;
      }
      return { valid: true };
    }

    return { valid: true }; // 자유 입력도 허용
  }

  /**
   * capitalize 함수
   */
  capitalize(value) {
    if (!value) return value;

    return value
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // ========== JobType 관련 메서드들 ==========

  /**
   * 직업 옵션 표시
   */
  async showJobTypeOptions() {
    try {
      // 이전 상태 초기화
      this.resetJobTypeSelectionState();

      this.addHistoryLine(this.getMessage("loadingJobTypes"), "info-msg");

      const jobTypes = await this.loadJobTypes();
      this.jobTypeOptions = jobTypes;

      // 로딩 메시지 제거
      const historyLines =
        this.terminalHistory.querySelectorAll(".history-line");
      const lastLine = historyLines[historyLines.length - 1];
      if (
        lastLine &&
        lastLine.textContent.includes(this.getMessage("loadingJobTypes"))
      ) {
        lastLine.remove();
      }

      this.addHistoryLine(this.getMessage("availableJobTypes"), "info-msg");
      this.addHistoryLine("", "");

      // 화살표 네비게이션 안내 추가
      this.addHistoryLine(
        this.getMessage("helpJobTypeSelection"),
        "system-msg"
      );
      this.addHistoryLine("", "");

      this.jobTypeSessionId = Date.now() + Math.random(); // JobType 선택 전용 세션 ID 생성

      console.log(
        `JobType selection started with session ID: ${this.jobTypeSessionId}`
      );

      jobTypes.forEach((jobType, index) => {
        const line = document.createElement("div");
        line.className = "history-line system-msg";
        line.setAttribute("data-jobtype-option", index);
        line.setAttribute("data-jobtype-session", this.jobTypeSessionId);

        const displayName = jobType.displayName || jobType.name || "Unknown";
        const description = jobType.description || "";

        line.textContent = `  ${(index + 1)
          .toString()
          .padStart(2)}. ${displayName.padEnd(25)} - ${description}`;
        this.terminalHistory.appendChild(line);
      });

      // 선택 모드 활성화
      this.jobTypeSelectionMode = true;
      this.jobTypeSelectedIndex = -1;

      this.scrollToShowJobTypeList();
      this.updateJobTypeSelection();
    } catch (error) {
      console.error("Failed to load job types:", error);
      this.addHistoryLine(this.getMessage("failedToLoadJobTypes"), "error-msg");
      this.addHistoryLine("", "");
    }
  }

  /**
   * JobType 선택 상태 초기화
   */
  resetJobTypeSelectionState() {
    this.jobTypeSelectionMode = false;
    this.jobTypeOptions = [];
    this.jobTypeSelectedIndex = -1;
    this.jobTypeDisplayedOptions = [];

    const existingSelections =
      this.terminalHistory.querySelectorAll(".jobtype-selected");
    existingSelections.forEach((element) => {
      element.classList.remove("jobtype-selected");
      element.style.backgroundColor = "";
      element.style.color = "";
    });

    console.log("JobType selection state reset");
  }

  /**
   * JobType 선택 상태 업데이트
   */
  updateJobTypeSelection() {
    if (!this.jobTypeSelectionMode || this.jobTypeOptions.length === 0) return;

    // 기존 선택 표시 제거
    const existingSelection = this.terminalHistory.querySelector(
      `.jobtype-selected[data-jobtype-session="${this.jobTypeSessionId}"]`
    );
    if (existingSelection) {
      existingSelection.classList.remove("jobtype-selected");
      existingSelection.style.backgroundColor = "";
      existingSelection.style.color = "";
    }

    // 새로운 선택 표시
    if (this.jobTypeSelectedIndex >= 0) {
      const currentSessionOptions = this.terminalHistory.querySelectorAll(
        `[data-jobtype-option][data-jobtype-session="${this.jobTypeSessionId}"]`
      );

      if (currentSessionOptions[this.jobTypeSelectedIndex]) {
        const selectedLine = currentSessionOptions[this.jobTypeSelectedIndex];
        selectedLine.classList.add("jobtype-selected");
        selectedLine.style.backgroundColor = "var(--terminal-prompt)";
        selectedLine.style.color = "var(--terminal-bg)";

        // 선택된 항목으로 스크롤
        selectedLine.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  /**
   * JobType 화살표 네비게이션 처리
   */
  handleJobTypeNavigation(direction) {
    if (!this.jobTypeSelectionMode || this.jobTypeOptions.length === 0)
      return false;

    if (direction === "up") {
      if (this.jobTypeSelectedIndex > 0) {
        this.jobTypeSelectedIndex--;
      } else {
        this.jobTypeSelectedIndex = this.jobTypeOptions.length - 1; // 맨 아래로 순환
      }
    } else if (direction === "down") {
      if (this.jobTypeSelectedIndex < this.jobTypeOptions.length - 1) {
        this.jobTypeSelectedIndex++;
      } else {
        this.jobTypeSelectedIndex = 0; // 맨 위로 순환
      }
    }

    this.updateJobTypeSelection();
    return true; // 네비게이션 처리됨
  }

  /**
   * JobType 선택 확정
   */
  selectCurrentJobType() {
    if (!this.jobTypeSelectionMode || this.jobTypeSelectedIndex < 0)
      return false;

    const selectedJobType = this.jobTypeOptions[this.jobTypeSelectedIndex];
    if (!selectedJobType) return false;

    const displayName =
      selectedJobType.displayName || selectedJobType.name || "Unknown";

    // 선택된 JobType을 입력으로 설정
    this.currentInputText = displayName;
    this.cursorPosition = this.currentInputText.length;

    // 선택 표시 제거
    const existingSelection = this.terminalHistory.querySelector(
      `.jobtype-selected[data-jobtype-session="${this.jobTypeSessionId}"]`
    );
    if (existingSelection) {
      existingSelection.classList.remove("jobtype-selected");
      existingSelection.style.backgroundColor = "";
      existingSelection.style.color = "";
    }

    this.resetJobTypeSelectionState();
    this.updateInputDisplay();

    // 선택 완료 처리
    this.processSignupInput();
    return true; // 선택 처리됨
  }

  /**
   * 편집 모드용 JobType 선택 확정
   */
  selectCurrentJobTypeForEdit() {
    if (!this.jobTypeSelectionMode || this.jobTypeSelectedIndex < 0)
      return false;

    const selectedJobType = this.jobTypeOptions[this.jobTypeSelectedIndex];
    if (!selectedJobType) return false;

    // 선택된 JobType을 입력으로 설정
    const displayName =
      selectedJobType.displayName || selectedJobType.name || "Unknown";

    this.currentInputText = displayName;
    this.cursorPosition = this.currentInputText.length;

    // 선택 표시 제거
    const existingSelection = this.terminalHistory.querySelector(
      `.jobtype-selected[data-jobtype-session="${this.jobTypeSessionId}"]`
    );
    if (existingSelection) {
      existingSelection.classList.remove("jobtype-selected");
      existingSelection.style.backgroundColor = "";
      existingSelection.style.color = "";
    }

    this.resetJobTypeSelectionState();
    this.updateInputDisplay();

    // 선택 완료 처리
    this.processEditInput();
    return true; // 선택 처리됨
  }

  /**
   * JobType 선택 모드 종료
   */
  exitJobTypeSelectionMode() {
    this.jobTypeSelectionMode = false;
    this.jobTypeSelectedIndex = -1;

    // 선택 표시 제거
    const existingSelection =
      this.terminalHistory.querySelector(".jobtype-selected");
    if (existingSelection) {
      existingSelection.classList.remove("jobtype-selected");
      existingSelection.style.backgroundColor = "";
      existingSelection.style.color = "";
    }
  }

  /**
   * JobType 목록으로 스크롤
   */
  scrollToShowJobTypeList() {
    if (!this.jobTypeSessionId) return;

    // DOM 업데이트가 완료될 때까지 약간 대기
    setTimeout(() => {
      this.performSmoothScrollToJobTypeList();
    }, 100); // DOM 렌더링 완료 대기
  }

  /**
   * 실제 스크롤 수행
   */
  performSmoothScrollToJobTypeList() {
    const currentSessionOptions = this.terminalHistory.querySelectorAll(
      `[data-jobtype-option][data-jobtype-session="${this.jobTypeSessionId}"]`
    );

    if (currentSessionOptions.length === 0) return;

    const firstOption = currentSessionOptions[0];
    const lastOption = currentSessionOptions[currentSessionOptions.length - 1];

    if (!firstOption || !lastOption) return;

    const terminalRect = this.terminalScreen.getBoundingClientRect();
    const firstRect = firstOption.getBoundingClientRect();
    const lastRect = lastOption.getBoundingClientRect();

    const listHeight = lastRect.bottom - firstRect.top;
    const terminalHeight = this.terminalScreen.clientHeight;

    console.log(`JobType list: ${listHeight}px, terminal: ${terminalHeight}px`);

    // 단일 스크롤 동작
    if (listHeight > terminalHeight * 0.9) {
      // 목록이 화면보다 크면 첫 번째 옵션을 화면 상단에
      firstOption.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      console.log("Scrolled to list start (large list)");
    } else {
      // 목록이 작으면 적절한 위치에 배치
      const availableSpace = terminalHeight - listHeight;
      const topPadding = Math.min(availableSpace * 0.3, 100); // 상단 여백을 30% 또는 최대 100px

      // 계산된 위치로 스크롤
      this.terminalScreen.scrollTo({
        top: firstOption.offsetTop - topPadding,
        behavior: "smooth",
      });
      console.log("Scrolled to optimal position (small list)");
    }
  }

  // ========== 로그인 관련 메서드들 ==========

  /**
   * 로그인 프로세스 시작
   */
  startLoginProcess() {
    this.loginInProgress = true;
    this.loginStep = 0;
    this.loginData = {};

    this.addHistoryLine("\n", "");
    this.addHistoryLine("=".repeat(50), "info-msg");
    this.addHistoryLine(
      `                   ${this.getMessage("tissueLogin")}`,
      "success-msg"
    );
    this.addHistoryLine("=".repeat(50), "info-msg");
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("enterCredentials"), "system-msg");
    this.addHistoryLine(this.getMessage("canCancelLogin"), "system-msg");
    this.addHistoryLine("", "");

    setTimeout(() => this.promptLoginField(), 300);
  }

  /**
   * 로그인 필드 입력 요청
   */
  promptLoginField() {
    const fields = [
      {
        name: "identifier",
        prompt: this.getMessage("loginIdOrEmail"),
        sensitive: false,
      },
      {
        name: "password",
        prompt: this.getMessage("password"),
        sensitive: true,
      },
    ];

    if (this.loginStep >= fields.length) {
      this.processLogin();
      return;
    }

    const field = fields[this.loginStep];
    this.currentFieldInfo = field;

    this.currentInputText = "";
    this.cursorPosition = 0;
    this.updateInputDisplay();

    // this.addHistoryLine(`${field.prompt}:`, "info-msg");
    this.updatePromptForLogin(field);
  }

  /**
   * 로그인용 프롬프트 업데이트
   */
  updatePromptForLogin(field) {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = `${field.prompt}: `;
    }
  }

  /**
   * 로그인 중 키 입력 처리
   */
  handleLoginKeyPress(event) {
    const field = this.currentFieldInfo;
    if (!field) return;

    if (event.key === "Enter") {
      this.processLoginInput();
    } else if (event.key === "Backspace") {
      this.handleBackspaceInSpecialMode();
    } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
      this.cancelLoginProcess();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      this.addCharacterToInputInSpecialMode(event.key);
    }
  }

  /**
   * 로그인 입력 처리
   */
  async processLoginInput() {
    const field = this.currentFieldInfo;
    const value = this.currentInputText.trim();

    // 입력 내용을 히스토리에 표시
    const displayValue = field.sensitive
      ? "*".repeat(this.currentInputText.length)
      : value;
    this.addCommandToLoginHistory(field.prompt + ": " + displayValue);

    if (!value) {
      this.addHistoryLine(this.getMessage("required"), "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    // 데이터 저장
    this.loginData[field.name] = value;

    // 다음 단계로
    this.loginStep++;
    this.currentInputText = "";
    this.updateInputDisplay();

    setTimeout(() => this.promptLoginField(), 200);
  }

  /**
   * 로그인 처리
   */
  async processLogin() {
    this.addHistoryLine("", "");
    this.addHistoryLine(this.getMessage("authenticating"), "info-msg");

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: this.getApiHeaders(),
        body: JSON.stringify(this.loginData),
      });

      if (response.status === 200) {
        const result = await response.json();

        this.isLoggedIn = true;
        this.currentUser = result.data;
        this.promptPrefix = `${this.currentUser.username}@tissue:~$ `;

        this.addHistoryLine(this.getMessage("loginSuccessful"), "success-msg");
        this.addHistoryLine(
          `${this.getMessage("welcomeBack")}, ${this.currentUser.username}!`,
          "system-msg"
        );
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");

        this.resetLoginState();
      } else if (response.status === 401) {
        this.addHistoryLine(this.getMessage("invalidCredentials"), "error-msg");
        this.addHistoryLine(this.getMessage("checkCredentials"), "system-msg");
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");
        this.resetLoginState();
      } else {
        this.addHistoryLine(this.getMessage("loginFailed"), "error-msg");
        this.addHistoryLine(this.getMessage("tryAgainLater"), "system-msg");
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");
        this.resetLoginState();
      }
    } catch (error) {
      console.error("Login failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine(this.getMessage("checkConnection"), "system-msg");
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");
      this.resetLoginState();
    }
  }

  /**
   * 로그아웃 처리
   */
  async performLogout() {
    this.addHistoryLine(this.getMessage("loggingOut"), "info-msg");

    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: this.getApiHeaders(false),
      });

      this.isLoggedIn = false;
      this.currentUser = null;
      this.promptPrefix = "guest@tissue:~$ ";

      this.addHistoryLine(
        this.getMessage("loggedOutSuccessfully"),
        "success-msg"
      );
      this.addHistoryLine(this.getMessage("thankYouForUsing"), "system-msg");
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");

      this.resetPromptAfterLogout();
    } catch (error) {
      console.error("Logout error:", error);
      this.isLoggedIn = false;
      this.currentUser = null;
      this.promptPrefix = "guest@tissue:~$ ";
      this.resetPromptAfterLogout();
    }
  }

  /**
   * 사용자 프로필 표시
   */
  async displayUserProfile() {
    this.addHistoryLine(this.getMessage("loadingProfile"), "info-msg");

    try {
      const response = await fetch("/api/v1/members", {
        credentials: "include",
        headers: this.getApiHeaders(false),
      });

      if (response.status === 200) {
        const result = await response.json();
        const profile = result.data;

        this.addHistoryLine("\n", "");
        this.addHistoryLine("", "");
        this.addHistoryLine("=".repeat(50), "info-msg");
        this.addHistoryLine(
          `                   ${this.getMessage("userProfile")}`,
          "success-msg"
        );
        this.addHistoryLine("=".repeat(50), "info-msg");
        this.addHistoryLine("", "");

        // 프로필 정보 표시
        const profileInfo = [
          {
            label: `${this.getMessage("loginId")}:`,
            value: profile.loginId || "N/A",
          },
          {
            label: `${this.getMessage("username")}:`,
            value: profile.username || "N/A",
          },
          {
            label: `${this.getMessage("email")}:`,
            value: profile.email || "N/A",
          },
          {
            label: `${this.getMessage("namePrompt")}:`,
            value: profile.name || this.getMessage("notSet"),
          },
          {
            label: `${this.getMessage("birthDatePrompt")}:`,
            value: profile.birthDate || this.getMessage("notSet"),
          },
          {
            label: `${this.getMessage("jobTypePrompt")}:`,
            value: profile.jobType || this.getMessage("notSet"),
          },
        ];

        profileInfo.forEach((item) => {
          const line = document.createElement("div");
          line.className = "system-info-line";

          const label = document.createElement("span");
          label.className = "info-label";
          label.textContent = item.label.padEnd(15);

          const value = document.createElement("span");
          value.className = "info-value";
          value.textContent = item.value;

          line.appendChild(label);
          line.appendChild(value);
          this.terminalHistory.appendChild(line);
        });

        this.addHistoryLine("", "");
        this.addHistoryLine(this.getMessage("useEditCommand"), "system-msg");
        this.addHistoryLine(this.getMessage("availableFields"), "system-msg");
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");

        this.scrollToBottom();
      } else if (response.status === 401) {
        this.addHistoryLine(this.getMessage("sessionExpired"), "error-msg");
        this.addHistoryLine(this.getMessage("loginAgain"), "system-msg");
        this.addHistoryLine("", "");
        this.handleSessionExpired();
      } else {
        this.addHistoryLine(
          this.getMessage("failedToLoadProfile"),
          "error-msg"
        );
        this.addHistoryLine(this.getMessage("tryAgainLater"), "system-msg");
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");
      }
    } catch (error) {
      console.error("Profile loading failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");
    }
  }

  // ========== 프로필 수정 관련 메서드들 ==========

  /**
   * 프로필 수정 프로세스 시작
   */
  startEditProcess(args) {
    const field = args[0];

    if (!field) {
      this.addHistoryLine(this.getMessage("editUsage"), "error-msg");
      this.addHistoryLine(this.getMessage("availableFields"), "system-msg");
      this.addHistoryLine("", "");
      return;
    }

    const editableFields = {
      username: {
        prompt: this.getMessage("usernamePrompt"),
        description: this.getMessage("usernameDesc"),
        validation: this.validateUsername.bind(this),
        endpoint: "/api/v1/members/username",
        requestKey: "newUsername",
        requiresCurrentPassword: true,
      },
      email: {
        prompt: this.getMessage("emailPrompt"),
        description: this.getMessage("emailDesc"),
        validation: this.validateEmail.bind(this),
        endpoint: "/api/v1/members/email",
        requestKey: "newEmail",
        requiresCurrentPassword: true,
        requiresVerification: true,
      },
      name: {
        prompt: this.getMessage("namePrompt"),
        description: this.getMessage("nameDesc"),
        validation: this.validateName.bind(this),
        endpoint: "/api/v1/members",
        requestKey: "name",
        requiresCurrentPassword: false,
      },
      birthDate: {
        prompt: this.getMessage("birthDatePrompt"),
        description: this.getMessage("birthDateDesc"),
        validation: this.validateBirthDate.bind(this),
        endpoint: "/api/v1/members",
        requestKey: "birthDate",
        requiresCurrentPassword: false,
      },
      jobType: {
        prompt: this.getMessage("jobTypePrompt"),
        description: this.getMessage("jobTypeDesc"),
        validation: this.validateJobType.bind(this),
        endpoint: "/api/v1/members",
        requestKey: "jobType",
        requiresCurrentPassword: false,
      },
      password: {
        prompt: this.getMessage("newPassword"),
        description: this.getMessage("passwordDesc"),
        validation: this.validateNewPassword.bind(this),
        endpoint: "/api/v1/members/password",
        requestKey: "newPassword",
        requiresCurrentPassword: true,
        requiresConfirmation: true,
        sensitive: true,
      },
    };

    if (!editableFields[field]) {
      this.addHistoryLine(
        `${this.getMessage("unknownField")}: ${field}`,
        "error-msg"
      );
      this.addHistoryLine(
        `${this.getMessage("availableFieldsList")}: ${Object.keys(
          editableFields
        ).join(", ")}`,
        "system-msg"
      );
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");
      return;
    }

    this.startFieldEdit(field, editableFields[field]);
  }

  /**
   * 필드 편집 시작
   */
  startFieldEdit(field, fieldInfo) {
    this.editInProgress = true;
    this.editData = { field: field, fieldInfo: fieldInfo };
    this.editFieldInfo = fieldInfo;

    this.addHistoryLine(this.getMessage("profileEditMode"), "info-msg");
    this.addHistoryLine(
      `${this.getMessage("editing")}: ${field}`,
      "system-msg"
    );
    this.addHistoryLine(`${fieldInfo.description}`, "system-msg");
    this.addHistoryLine(this.getMessage("canCancelEditing"), "system-msg");
    this.addHistoryLine("", "");

    if (field === "jobType") {
      this.showJobTypeOptions();
    }

    // 현재 패스워드가 필요한 필드인 경우
    if (fieldInfo.requiresCurrentPassword) {
      this.editData.step = "current_password";
      this.currentFieldInfo = {
        prompt: this.getMessage("currentPassword"),
        sensitive: true,
      };
      this.addHistoryLine(this.getMessage("enterCurrentPassword"), "info-msg");
    } else {
      // 일반 필드는 바로 입력 시작
      this.editData.step = "field_input";
      this.currentFieldInfo = fieldInfo;
    }

    this.currentInputText = "";
    this.cursorPosition = 0;

    this.updateInputDisplay();
    this.updatePromptForEdit();
  }

  /**
   * 수정용 프롬프트 업데이트
   */
  updatePromptForEdit() {
    const promptElement = this.currentPrompt?.querySelector(".prompt-prefix");
    if (promptElement && this.currentFieldInfo) {
      promptElement.textContent = `${this.currentFieldInfo.prompt}: `;
      promptElement.style.color = "var(--edit-prompt)";
      // promptElement.style.color = "#FF6B6B";
    }
  }

  /**
   * 수정 중 키 입력 처리
   */
  handleEditKeyPress(event) {
    const field = this.currentFieldInfo;
    if (!field) return;

    // JobType 선택 모드일 때 화살표 처리
    if (this.editData.field === "jobType" && this.jobTypeSelectionMode) {
      if (event.key === "ArrowUp") {
        this.handleJobTypeNavigation("up");
        return;
      } else if (event.key === "ArrowDown") {
        this.handleJobTypeNavigation("down");
        return;
      } else if (event.key === "Enter") {
        if (this.selectCurrentJobTypeForEdit()) {
          return; // 선택 완료됨
        }
        // 선택된 항목이 없으면 일반 Enter 처리로 진행
      } else if (event.key === "Escape") {
        this.resetJobTypeSelectionState();
        return;
      } else if (event.key.length === 1) {
        // 문자 입력 시 선택 모드 종료하고 직접 입력 모드로
        this.resetJobTypeSelectionState();
        this.addCharacterToInputInSpecialMode(event.key);
        return;
      }
    }

    // 일반키 처리
    if (event.key === "Enter") {
      this.processEditInput();
    } else if (event.key === "Backspace") {
      // JobType 선택 모드면 종료
      if (this.editData.field === "jobType" && this.jobTypeSelectionMode) {
        this.exitJobTypeSelectionMode();
      }

      this.handleBackspaceInSpecialMode();
    } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
      this.cancelEditProcess();
    } else if (event.key === "Tab" && this.editData.field === "jobType") {
      this.showJobTypeOptions();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      // JobType 선택 모드면 종료하고 직접 입력
      if (this.editData.field === "jobType" && this.jobTypeSelectionMode) {
        this.exitJobTypeSelectionMode();
      }

      this.addCharacterToInputInSpecialMode(event.key);
    }
  }

  /**
   * 프로필 수정 처리 (보안 강화된 버전)
   */
  async processEditInput() {
    const value = this.currentInputText.trim();
    const step = this.editData.step;

    if (!value) {
      this.addHistoryLine("✗ Value cannot be empty", "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    // 입력 값을 히스토리에 표시
    const displayValue = this.currentFieldInfo?.sensitive
      ? "*".repeat(this.currentInputText.length)
      : value;

    this.addCommandToEditHistory(
      `${this.currentFieldInfo?.prompt || "Input"}: ${displayValue}`
    );

    try {
      if (step === "current_password") {
        await this.handleCurrentPasswordInput(value);
      } else if (step === "new_password") {
        await this.handleNewPasswordInput(value);
      } else if (step === "confirm_password") {
        await this.handleConfirmPasswordInput(value);
      } else if (step === "field_input") {
        await this.handleFieldInput(value);
      } else {
        console.warn(`Unknown edit step: ${step}`);
        this.addHistoryLine("✗ Internal error: unknown edit step", "error-msg");
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");
        this.resetEditState();
      }
    } catch (error) {
      console.error("Edit process failed:", error);
      this.addHistoryLine("✗ Network error occurred", "error-msg");
      this.addHistoryLine("", "");
      this.addHistoryLine("\n", "");
      this.resetEditState();
    }
  }

  /**
   * 현재 패스워드 입력 처리
   */
  async handleCurrentPasswordInput(currentPassword) {
    if (this.editData.fieldInfo.requiresCurrentPassword) {
      this.addHistoryLine("", "");
      this.addHistoryLine(this.getMessage("verifyingPassword"), "info-msg");

      try {
        await this.requestUpdatePermission(currentPassword);

        this.addHistoryLine(
          this.getMessage("permissionGranted"),
          "success-msg"
        );
        this.addHistoryLine("", "");

        if (this.editData.field === "password") {
          this.editData.currentPassword = currentPassword;
          this.editData.step = "new_password";
          this.currentFieldInfo = {
            prompt: this.getMessage("newPassword"),
            sensitive: true,
          };
          this.addHistoryLine(
            this.getMessage("enterNewPassword").replace(
              "{0}",
              this.getMessage("password")
            ),
            "info-msg"
          );
        } else {
          this.editData.step = "field_input";
          this.currentFieldInfo = this.editData.fieldInfo;
          this.addHistoryLine(
            this.getMessage("enterNewField").replace(
              "{0}",
              this.editData.field
            ),
            "info-msg"
          );
        }
      } catch (error) {
        this.addHistoryLine(
          this.getMessage("incorrectCurrentPassword"),
          "error-msg"
        );
        this.addHistoryLine("", "");
        this.addHistoryLine("\n", "");
        this.resetEditState();
        return;
      }
    } else {
      this.editData.step = "field_input";
      this.currentFieldInfo = this.editData.fieldInfo;
      this.addHistoryLine("", "");
      this.addHistoryLine(
        this.getMessage("enterNewField").replace("{0}", this.editData.field),
        "info-msg"
      );
    }

    this.currentInputText = "";
    this.updateInputDisplay();
    this.updatePromptForEdit();
  }

  /**
   * 권한 요청 (현재 패스워드로 세션에 권한 설정)
   */
  async requestUpdatePermission(currentPassword) {
    const response = await fetch("/api/v1/members/permissions", {
      method: "POST",
      credentials: "include",
      headers: this.getApiHeaders(),
      body: JSON.stringify({ password: currentPassword }),
    });

    if (response.status !== 200) {
      throw new Error("Permission request failed");
    }
  }

  /**
   * 현재 패스워드 검증 (서버로 즉시 전송)
   */
  async sendCurrentPasswordVerification(currentPassword) {
    const response = await fetch("/api/v1/members/verify-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: currentPassword }),
    });

    if (response.status !== 200) {
      throw new Error("Password verification failed");
    }

    // 임시 토큰을 받아서 다음 요청에 사용
    const result = await response.json();
    this.editData.verificationToken = result.data?.token;
  }

  /**
   * 새 패스워드 입력 처리
   */
  async handleNewPasswordInput(newPassword) {
    const isValid = await this.editData.fieldInfo.validation(newPassword);
    if (!isValid.valid) {
      this.addHistoryLine(`✗ ${isValid.error}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    if (this.editData.fieldInfo.requiresConfirmation) {
      this.editData.newPassword = newPassword;
      this.editData.step = "confirm_password";
      this.currentFieldInfo = {
        prompt: this.getMessage("confirmNewPassword"),
        sensitive: true,
      };

      this.addHistoryLine("", "");
      this.addHistoryLine(
        this.getMessage("confirmNewPasswordPrompt"),
        "info-msg"
      );

      this.currentInputText = "";
      this.updateInputDisplay();
      this.updatePromptForEdit();
      return;
    }

    await this.sendUpdateRequest(
      {
        originalPassword: this.editData.currentPassword,
        newPassword: newPassword,
      },
      this.editData.fieldInfo.endpoint
    );
  }

  /**
   * 패스워드 재입력 확인 처리
   */
  async handleConfirmPasswordInput(confirmPassword) {
    if (confirmPassword !== this.editData.newPassword) {
      this.addHistoryLine(this.getMessage("passwordsDoNotMatch"), "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    await this.sendUpdateRequest(
      {
        originalPassword: this.editData.currentPassword,
        newPassword: this.editData.newPassword,
      },
      this.editData.fieldInfo.endpoint
    );
  }

  /**
   * 일반 필드 입력 처리
   */
  async handleFieldInput(value) {
    const fieldInfo = this.editData.fieldInfo;
    if (!fieldInfo) {
      console.error("fieldInfo is missing in editData");
      this.addHistoryLine(
        "✗ Internal error: field information missing",
        "error-msg"
      );
      this.resetEditState();
      return;
    }

    try {
      // 이메일의 경우 별도 처리
      if (this.editData.field === "email") {
        await this.handleEmailUpdate(value);
        return;
      }

      const isValid = await fieldInfo.validation(value);
      if (!isValid.valid) {
        this.addHistoryLine(`✗ ${isValid.error}`, "error-msg");
        this.addHistoryLine("", "");
        this.currentInputText = "";
        this.updateInputDisplay();
        return;
      }

      // 업데이트 요청 데이터 준비
      const updateData = {};
      updateData[fieldInfo.requestKey] = value;

      // 모든 업데이트는 세션 권한으로 처리 (별도 패스워드 불필요)
      await this.sendUpdateRequest(updateData, fieldInfo.endpoint);
    } catch (error) {
      console.error("Field validation or update failed:", error);
      this.addHistoryLine(`✗ Validation error: ${error.message}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
    }
  }

  /**
   * 이메일 업데이트 처리 (현재 패스워드와 함께)
   */
  async handleEmailUpdate(email) {
    const isValid = await this.editData.fieldInfo.validation(email);
    if (!isValid.valid) {
      this.addHistoryLine(`✗ ${isValid.error}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
      return;
    }

    this.addHistoryLine("", "");
    this.addHistoryLine(
      this.getMessage("sendingVerificationEmail"),
      "info-msg"
    );

    try {
      const response = await fetch(
        "/api/v1/members/email-verification/request",
        {
          method: "POST",
          credentials: "include",
          headers: this.getApiHeaders(),
          body: JSON.stringify({ email: email }),
        }
      );

      if (response.ok) {
        this.addHistoryLine(
          this.getMessage("verificationEmailSent"),
          "success-msg"
        );
        this.addHistoryLine("", "");
        this.addHistoryLine(
          this.getMessage("waitingEmailVerification"),
          "warning-msg"
        );
        this.addHistoryLine(
          `   ${this.getMessage("checkEmailAndClick")}`,
          "system-msg"
        );

        this.editData.pendingEmail = email;
        this.startEmailPollingForEdit(email);
      } else if (response.status === 403) {
        this.addHistoryLine(this.getMessage("permissionExpired"), "error-msg");
        this.addHistoryLine(
          this.getMessage("tryEditCommandAgain"),
          "system-msg"
        );
        this.addHistoryLine("", "");
        this.resetEditState();
      } else {
        const errorData = await response.json().catch(() => null);
        this.addHistoryLine(
          `✗ ${errorData?.message || this.getMessage("failedToSendEmail")}`,
          "error-msg"
        );
        this.addHistoryLine("", "");
        this.currentInputText = "";
        this.updateInputDisplay();
      }
    } catch (error) {
      console.error("Email verification request failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine("", "");
      this.currentInputText = "";
      this.updateInputDisplay();
    }
  }

  /**
   * 편집 중 이메일 인증 폴링
   */
  startEmailPollingForEdit(email) {
    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
    }

    let attempts = 0;
    const maxAttempts = 300; // 5분

    this.emailPollingInterval = setInterval(async () => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(this.emailPollingInterval);
        this.addHistoryLine(
          this.getMessage("emailVerificationTimeout"),
          "warning-msg"
        );
        this.addHistoryLine("", "");
        this.resetEditState();
        return;
      }

      try {
        const response = await fetch(
          `/api/v1/members/email-verification/status?email=${encodeURIComponent(
            email
          )}`,
          {
            headers: this.getApiHeaders(false),
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.data === true) {
            clearInterval(this.emailPollingInterval);
            this.addHistoryLine(
              this.getMessage("emailVerifiedSuccessfully"),
              "success-msg"
            );
            this.addHistoryLine("", "");

            await this.sendUpdateRequest(
              { newEmail: this.editData.pendingEmail },
              this.editData.fieldInfo.endpoint
            );
          }
        }
      } catch (error) {
        console.error("Email verification polling error:", error);
      }
    }, 1000);
  }

  /**
   * 일반 업데이트 요청 전송
   */
  async sendUpdateRequest(data, endpoint) {
    this.addHistoryLine(this.getMessage("updatingProfile"), "info-msg");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: this.getApiHeaders(),
        body: JSON.stringify(data),
      });

      if (response.status === 200) {
        this.addHistoryLine(
          this.getMessage("profileUpdatedSuccessfully"),
          "success-msg"
        );

        if (this.editData.field === "password") {
          this.addHistoryLine(this.getMessage("passwordChanged"), "info-msg");
          this.addHistoryLine(
            this.getMessage("useNewPasswordForLogin"),
            "system-msg"
          );
        } else {
          const displayValue =
            data[this.editData.fieldInfo.requestKey] || data.newEmail;
          this.addHistoryLine(
            `${this.editData.field}: ${displayValue}`,
            "info-msg"
          );
        }

        this.addHistoryLine("", "");
        this.resetEditState();
      } else if (response.status === 401) {
        this.addHistoryLine(
          this.getMessage("authenticationFailed"),
          "error-msg"
        );
        this.addHistoryLine(this.getMessage("loginAgain"), "system-msg");
        this.addHistoryLine("", "");
        this.handleSessionExpired();
      } else if (response.status === 403) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.message?.includes("password")) {
          this.addHistoryLine(
            this.getMessage("incorrectCurrentPassword"),
            "error-msg"
          );
          this.addHistoryLine(
            this.getMessage("currentPasswordIncorrect"),
            "system-msg"
          );
        } else {
          this.addHistoryLine(
            this.getMessage("permissionExpired"),
            "error-msg"
          );
          this.addHistoryLine(
            this.getMessage("tryEditCommandAgain"),
            "system-msg"
          );
        }
        this.addHistoryLine("", "");
        this.resetEditState();
      } else if (response.status === 409) {
        const errorData = await response.json().catch(() => null);
        this.addHistoryLine(
          `✗ ${errorData?.message || this.getMessage("valueAlreadyInUse")}`,
          "error-msg"
        );
        this.addHistoryLine("", "");
        this.currentInputText = "";
        this.updateInputDisplay();
      } else {
        const errorData = await response.json().catch(() => null);
        this.addHistoryLine(
          `✗ ${this.getMessage("updateFailed")}: ${
            errorData?.message || "Unknown error"
          }`,
          "error-msg"
        );
        this.addHistoryLine(this.getMessage("tryAgainLater"), "system-msg");
        this.addHistoryLine("", "");
        this.resetEditState();
      }
    } catch (error) {
      console.error("Update request failed:", error);
      this.addHistoryLine(`✗ ${this.getMessage("networkError")}`, "error-msg");
      this.addHistoryLine("", "");
      this.resetEditState();
    }
  }

  /**
   * 새 패스워드 검증
   */
  async validateNewPassword(value) {
    if (value.length < 8) {
      return {
        valid: false,
        error: this.getMessage("passwordMinLength"),
      };
    }

    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (!hasLetter || !hasNumber || !hasSymbol) {
      return {
        valid: false,
        error: this.getMessage("passwordRequirements"),
      };
    }

    return { valid: true };
  }

  // ========== 특별 모드 키 입력 처리 ==========

  /**
   * 특별 모드 키 입력 처리
   */
  handleSpecialModeKeyPress(event) {
    // IME(한글) 조합 중이면 특수키만 처리
    if (this.isComposing) {
      if (event.ctrlKey && event.key.toLowerCase() === "c") {
        if (this.signupInProgress) {
          this.cancelSignupProcess();
        } else if (this.loginInProgress) {
          this.cancelLoginProcess();
        } else if (this.editInProgress) {
          this.cancelEditProcess();
        }
      }
      return;
    }

    // 한글 입력 감지
    if (this.isKoreanInput(event)) {
      console.log("Korean input in special mode, waiting for composition");
      return;
    }

    if (this.signupInProgress) {
      this.handleSignupKeyPress(event);
    } else if (this.loginInProgress) {
      this.handleLoginKeyPress(event);
    } else if (this.editInProgress) {
      this.handleEditKeyPress(event);
    }
  }

  // ========== 상태 초기화 및 정리 메서드들 ==========

  /**
   * 로그인 상태 초기화
   */
  resetLoginState() {
    this.loginInProgress = false;
    this.loginStep = 0;
    this.loginData = {};
    this.currentFieldInfo = null;
    this.resetPromptAfterLogin();
  }

  /**
   * 프로필 수정 상태 초기화
   */
  resetEditState() {
    this.editInProgress = false;
    this.editFieldInfo = null;
    this.currentFieldInfo = null;

    // 이전 JobType 선택 모드 상태 초기화
    this.resetJobTypeSelectionState();

    // 메모리에서 민감한 데이터 완전 제거
    if (this.editData.currentPassword) {
      // 메모리에서 완전히 제거
      this.editData.currentPassword = null;
      delete this.editData.currentPassword;
    }
    if (this.editData.newPassword) {
      this.editData.newPassword = null;
      delete this.editData.newPassword;
    }

    this.editData = {};

    if (this.emailPollingInterval) {
      clearInterval(this.emailPollingInterval);
      this.emailPollingInterval = null;
    }

    this.resetPromptAfterEdit();
  }

  /**
   * 프롬프트 복원 메서드들
   */
  /**
   * TODO: 복원 메서드들 공통으로 사용해도 괜찮지 않을까?
   */
  resetPromptAfterLogin() {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = this.promptPrefix;
      promptElement.style.color = "var(--terminal-prompt)";
    }
    this.currentInputText = "";
    this.cursorPosition = 0; // 커서 위치 초기화
    this.updateInputDisplay();
  }

  resetPromptAfterEdit() {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = this.promptPrefix;
      promptElement.style.color = "var(--terminal-prompt)";
    }
    this.currentInputText = "";
    this.cursorPosition = 0; // 커서 위치 초기화
    this.updateInputDisplay();
  }

  resetPromptAfterLogout() {
    const promptElement = this.currentPrompt.querySelector(".prompt-prefix");
    if (promptElement) {
      promptElement.textContent = this.promptPrefix;
      promptElement.style.color = "var(--terminal-prompt)";
    }

    this.cursorPosition = 0; // 커서 위치 초기화
  }

  /**
   * 취소 처리 메서드들
   */
  cancelLoginProcess() {
    this.addHistoryLine("", "");
    this.addHistoryLine("^C", "system-msg");
    this.addHistoryLine(this.getMessage("loginCancelled"), "warning-msg");
    this.addHistoryLine("", "");
    this.resetLoginState();
  }

  cancelEditProcess() {
    this.addHistoryLine("", "");
    this.addHistoryLine("^C", "system-msg");
    this.addHistoryLine(
      this.getMessage("profileEditingCancelled"),
      "warning-msg"
    );
    this.addHistoryLine("", "");
    this.resetEditState();
  }

  /**
   * 히스토리 추가 메서드들
   */
  addCommandToLoginHistory(command) {
    const line = document.createElement("div");
    line.className = "history-line";

    const prompt = document.createElement("span");
    prompt.className = "history-prompt";
    prompt.textContent = this.currentFieldInfo.prompt + ": ";
    prompt.style.color = "var(--success-msg)"; // 로그인 필드를 입력하는 텍스트가 화면에 남음

    const commandSpan = document.createElement("span");
    commandSpan.className = "history-command";
    commandSpan.textContent = command.split(": ")[1] || "";

    line.appendChild(prompt);
    line.appendChild(commandSpan);
    this.terminalHistory.appendChild(line);
    this.scrollToBottom();
  }

  addCommandToEditHistory(command) {
    const line = document.createElement("div");
    line.className = "history-line";

    const prompt = document.createElement("span");
    prompt.className = "history-prompt";

    if (this.currentFieldInfo) {
      prompt.textContent = this.currentFieldInfo.prompt + ": ";
    } else {
      prompt.textContent = "Input: ";
    }
    prompt.style.color = "var(--edit-prompt)";

    const commandSpan = document.createElement("span");
    commandSpan.className = "history-command";
    commandSpan.textContent = command.split(": ")[1] || command;

    line.appendChild(prompt);
    line.appendChild(commandSpan);
    this.terminalHistory.appendChild(line);
    this.scrollToBottom();
  }

  /**
   * 세션 만료 처리
   */
  handleSessionExpired() {
    this.isLoggedIn = false;
    this.currentUser = null;
    this.promptPrefix = "guest@tissue:~$ ";
    this.resetPromptAfterLogout();

    // 진행 중인 프로세스들 정리
    if (this.editInProgress) this.resetEditState();
    if (this.loginInProgress) this.resetLoginState();
    if (this.signupInProgress) this.resetSignupState();
  }
}

// ========== 전역 인스턴스 및 초기화 ==========

// 전역 인스턴스
let terminal = null;

/**
 * 시스템 초기화
 */
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log("TISSUE Terminal: Starting system...");
    terminal = new TissueTerminal();
  } catch (error) {
    console.error("TISSUE Terminal: Critical startup failure", error);

    // 폴백 에러 화면
    document.body.innerHTML = `
           <div style="background: #000; color: #ff0000; font-family: monospace; padding: 20px; height: 100vh;">
               <h1>TISSUE Terminal - Startup Failed</h1>
               <p>The terminal system could not be initialized.</p>
               <p>Error: ${error.message}</p>
               <p><a href="/" style="color: #00ff00;">Return to homepage</a></p>
           </div>
       `;
  }
});

// 페이지 언로드 시 정리
window.addEventListener("beforeunload", () => {
  if (terminal && !terminal.isDestroyed) {
    terminal.cleanup();
  }
});

// 개발자 도구용 전역 접근
if (typeof window !== "undefined") {
  window.TISSUE_TERMINAL = terminal;
}
