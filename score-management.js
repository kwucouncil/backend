// score-management.js
class ScoreManagement {
    constructor() {
        this.apiBaseUrl = 'https://kwu-hoempage-backend.onrender.com/api/sports2025';
        this.scoreApiUrl = 'https://kwu-hoempage-backend.onrender.com/api/scoreManagement';
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.sports = [];
        this.matches = [];
        
        this.init();
    }

    async init() {
        try {
            await this.loadSports();
            await this.loadMatches();
            this.setupEventListeners();
        } catch (error) {
            console.error('초기화 오류:', error);
            this.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    setupEventListeners() {
        // 점수 수정 폼 이벤트
        document.getElementById('scoreForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateMatchScores();
        });

        // 상태 수정 폼 이벤트
        document.getElementById('statusForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateMatchStatus();
        });

        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            const scoreModal = document.getElementById('scoreModal');
            const statusModal = document.getElementById('statusModal');
            
            if (e.target === scoreModal) {
                this.closeScoreModal();
            }
            if (e.target === statusModal) {
                this.closeStatusModal();
            }
        });
    }

    async loadSports() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sports`);
            if (!response.ok) throw new Error('종목 목록을 불러올 수 없습니다.');
            
            const data = await response.json();
            this.sports = data.sports || [];
            
            const sportFilter = document.getElementById('sportFilter');
            sportFilter.innerHTML = '<option value="">전체 종목</option>';
            
            this.sports.forEach(sport => {
                const option = document.createElement('option');
                option.value = sport.id;
                option.textContent = sport.name;
                sportFilter.appendChild(option);
            });
        } catch (error) {
            console.error('종목 목록 로드 오류:', error);
            this.showError('종목 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    async loadMatches() {
        try {
            this.showLoading(true);
            this.hideMessages();

            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.pageSize
            });

            // 필터 파라미터 추가
            const dateFilter = document.getElementById('dateFilter').value;
            const sportFilter = document.getElementById('sportFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;

            if (dateFilter) params.append('date', dateFilter);
            if (sportFilter) params.append('sport_id', sportFilter);
            if (statusFilter) params.append('played', statusFilter);

            const response = await fetch(`${this.apiBaseUrl}/matches?${params}`);
            if (!response.ok) throw new Error('경기 목록을 불러올 수 없습니다.');
            
            const data = await response.json();
            this.matches = data.items || [];
            this.totalPages = Math.ceil(data.total / this.pageSize);
            
            this.renderMatches();
            this.renderPagination();
            
        } catch (error) {
            console.error('경기 목록 로드 오류:', error);
            this.showError('경기 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    renderMatches() {
        const matchesList = document.getElementById('matchesList');
        
        if (this.matches.length === 0) {
            matchesList.innerHTML = `
                <div class="match-card">
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <p>검색 조건에 맞는 경기가 없습니다.</p>
                    </div>
                </div>
            `;
            return;
        }

        matchesList.innerHTML = this.matches.map(match => this.createMatchCard(match)).join('');
    }

    createMatchCard(match) {
        const statusClass = match.rain ? 'status-canceled' : 
                           match.result ? 'status-played' : 'status-not-played';
        const statusText = match.rain ? '우천취소' : 
                          match.result ? '완료' : '미완료';

        const homeTeam = match.team1 || { name: 'TBD', score: 0 };
        const awayTeam = match.team2 || { name: 'TBD', score: 0 };

        return `
            <div class="match-card" data-match-id="${match.id || 'unknown'}">
                <div class="match-header">
                    <div class="match-info">
                        <div class="match-date">${this.formatDate(match.date)} ${match.start}시</div>
                        <div class="match-details">${match.sport} | ${match.place}</div>
                    </div>
                    <div class="match-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>

                <div class="teams-container">
                    <div class="team">
                        <div class="team-name">${homeTeam.name}</div>
                        <div class="score-display">${homeTeam.score}</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team">
                        <div class="team-name">${awayTeam.name}</div>
                        <div class="score-display">${awayTeam.score}</div>
                    </div>
                </div>

                <div class="match-actions">
                    <button class="btn btn-primary" onclick="scoreManagement.openScoreModal('${match.id || 'unknown'}')" disabled>
                        점수 수정 (준비중)
                    </button>
                    <button class="btn btn-secondary" onclick="scoreManagement.openStatusModal('${match.id || 'unknown'}')" disabled>
                        상태 수정 (준비중)
                    </button>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        const pages = [];
        
        // 이전 페이지 버튼
        pages.push(`
            <button ${this.currentPage <= 1 ? 'disabled' : ''} 
                    onclick="scoreManagement.goToPage(${this.currentPage - 1})">
                이전
            </button>
        `);

        // 페이지 번호들
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            pages.push(`<button onclick="scoreManagement.goToPage(1)">1</button>`);
            if (startPage > 2) {
                pages.push('<span>...</span>');
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button ${i === this.currentPage ? 'style="background: #4facfe; color: white;"' : ''} 
                        onclick="scoreManagement.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                pages.push('<span>...</span>');
            }
            pages.push(`<button onclick="scoreManagement.goToPage(${this.totalPages})">${this.totalPages}</button>`);
        }

        // 다음 페이지 버튼
        pages.push(`
            <button ${this.currentPage >= this.totalPages ? 'disabled' : ''} 
                    onclick="scoreManagement.goToPage(${this.currentPage + 1})">
                다음
            </button>
        `);

        pagination.innerHTML = pages.join('');
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadMatches();
    }

    async openScoreModal(matchId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/matches/${matchId}`);
            if (!response.ok) throw new Error('경기 정보를 불러올 수 없습니다.');
            
            const data = await response.json();
            const match = data.data;
            
            document.getElementById('modalMatchId').value = matchId;
            document.getElementById('modalHomeScore').value = match.team1?.score || 0;
            document.getElementById('modalAwayScore').value = match.team2?.score || 0;
            document.getElementById('modalIsPlayed').checked = match.result;
            document.getElementById('modalAdminNote').value = '';
            
            document.getElementById('scoreModal').style.display = 'block';
        } catch (error) {
            console.error('모달 열기 오류:', error);
            this.showError('경기 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async openStatusModal(matchId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/matches/${matchId}`);
            if (!response.ok) throw new Error('경기 정보를 불러올 수 없습니다.');
            
            const data = await response.json();
            const match = data.data;
            
            document.getElementById('statusModalMatchId').value = matchId;
            document.getElementById('statusModalIsPlayed').checked = match.result;
            document.getElementById('statusModalRainCanceled').checked = match.rain;
            document.getElementById('statusModalAdminNote').value = '';
            
            document.getElementById('statusModal').style.display = 'block';
        } catch (error) {
            console.error('상태 모달 열기 오류:', error);
            this.showError('경기 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async updateMatchScores() {
        try {
            const matchId = document.getElementById('modalMatchId').value;
            const homeScore = parseInt(document.getElementById('modalHomeScore').value);
            const awayScore = parseInt(document.getElementById('modalAwayScore').value);
            const isPlayed = document.getElementById('modalIsPlayed').checked;
            const adminNote = document.getElementById('modalAdminNote').value;

            const response = await fetch(`${this.scoreApiUrl}/matches/${matchId}/scores`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    home_score: homeScore,
                    away_score: awayScore,
                    is_played: isPlayed,
                    admin_note: adminNote
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '점수 업데이트에 실패했습니다.');
            }

            this.closeScoreModal();
            this.showSuccess('점수가 성공적으로 업데이트되었습니다.');
            this.loadMatches();
            
        } catch (error) {
            console.error('점수 업데이트 오류:', error);
            this.showError(error.message || '점수 업데이트 중 오류가 발생했습니다.');
        }
    }

    async updateMatchStatus() {
        try {
            const matchId = document.getElementById('statusModalMatchId').value;
            const isPlayed = document.getElementById('statusModalIsPlayed').checked;
            const rainCanceled = document.getElementById('statusModalRainCanceled').checked;
            const adminNote = document.getElementById('statusModalAdminNote').value;

            const response = await fetch(`${this.scoreApiUrl}/matches/${matchId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_played: isPlayed,
                    rain_canceled: rainCanceled,
                    admin_note: adminNote
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '상태 업데이트에 실패했습니다.');
            }

            this.closeStatusModal();
            this.showSuccess('경기 상태가 성공적으로 업데이트되었습니다.');
            this.loadMatches();
            
        } catch (error) {
            console.error('상태 업데이트 오류:', error);
            this.showError(error.message || '상태 업데이트 중 오류가 발생했습니다.');
        }
    }

    closeScoreModal() {
        document.getElementById('scoreModal').style.display = 'none';
        document.getElementById('scoreForm').reset();
    }

    closeStatusModal() {
        document.getElementById('statusModal').style.display = 'none';
        document.getElementById('statusForm').reset();
    }

    showLoading(show) {
        const loadingMessage = document.getElementById('loadingMessage');
        loadingMessage.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = message;
        errorMessage.style.display = 'block';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }

    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// 전역 함수들 (HTML에서 호출하기 위해)
let scoreManagement;

function loadMatches() {
    scoreManagement.loadMatches();
}

function closeScoreModal() {
    scoreManagement.closeScoreModal();
}

function closeStatusModal() {
    scoreManagement.closeStatusModal();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    scoreManagement = new ScoreManagement();
});
