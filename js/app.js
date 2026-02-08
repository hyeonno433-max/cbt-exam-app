/**
 * Main Application Entry Point
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mock Data
    if (!api.isProduction && api.init) {
        api.init();
    }

    // Load saved D-Day from localStorage
    const savedDDay = localStorage.getItem('cbt_dday');
    if (savedDDay && MOCK_DATA.user) {
        MOCK_DATA.user.settings.dDay = savedDDay;
    }

    console.log('App Initialized');

    // Initialize Router
    router.init();

    // ========== 모바일 사이드바 토글 기능 ==========
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
        mobileMenuToggle.innerHTML = '<span class="material-icons-round">close</span>';
        mobileMenuToggle.setAttribute('aria-label', '메뉴 닫기');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
        mobileMenuToggle.innerHTML = '<span class="material-icons-round">menu</span>';
        mobileMenuToggle.setAttribute('aria-label', '메뉴 열기');
    }

    if (mobileMenuToggle && sidebar && sidebarOverlay) {
        mobileMenuToggle.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        sidebarOverlay.addEventListener('click', closeSidebar);

        // 화면 크기 변경 시 사이드바 상태 초기화
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                closeSidebar();
            }
        });
    }

    // Event Listeners for Sidebar Navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const page = e.currentTarget.dataset.page;
            const state = store.getState();

            // 시험 중이면 이탈 확인 모달 표시
            if (state.examStatus === 'running') {
                const confirmed = await UI.modal.confirm('시험 중 화면을 이탈하면 시험이 종료됩니다.\n정말로 나가시겠습니까?');
                if (confirmed) {
                    store.setState({ examStatus: 'finished' });
                    Exam.stopTimer();
                    router.navigate(page);
                }
                return;
            }

            // 모바일에서 메뉴 선택 후 사이드바 닫기
            if (window.innerWidth < 768) {
                closeSidebar();
            }

            router.navigate(page);
        });
    });
});

/**
 * UI Utilities
 */
const UI = {
    modal: {
        show(title, content, buttons) {
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const contentEl = document.getElementById('modal-content');
            const actionsEl = document.getElementById('modal-actions');

            titleEl.textContent = title;
            contentEl.textContent = content;
            actionsEl.innerHTML = '';

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `btn ${btn.primary ? 'btn-primary' : ''}`;
                button.style.border = btn.primary ? 'none' : '1px solid var(--border-color)';
                button.textContent = btn.text;
                button.onclick = () => {
                    this.hide();
                    if (btn.onClick) btn.onClick();
                };
                actionsEl.appendChild(button);
            });

            overlay.classList.remove('hidden');
        },

        hide() {
            document.getElementById('modal-overlay').classList.add('hidden');
        },

        alert(content) {
            return new Promise((resolve) => {
                this.show('알림', content, [
                    { text: '확인', primary: true, onClick: resolve }
                ]);
            });
        },

        confirm(content) {
            return new Promise((resolve) => {
                this.show('확인', content, [
                    { text: '취소', primary: false, onClick: () => resolve(false) },
                    { text: '확인', primary: true, onClick: () => resolve(true) }
                ]);
            });
        }
    }
};
