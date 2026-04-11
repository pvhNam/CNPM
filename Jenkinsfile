pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo '🚚 Đang lấy code từ GitHub...'
                checkout scm
            }
        }

        stage('Build & Test') {
            steps {
                echo '🛠️ Đang cài đặt thư viện...'
                // Thay 'sh' bằng 'bat' vì bạn đang chạy trên Windows
                bat 'npm install'
            }
        }

        stage('Deploy to Render') {
            steps {
                echo '🚀 Đang gọi Render để cập nhật bản build mới...'
                /* Dùng 'bat' và bao quanh URL bằng dấu nháy kép. 
                   Lưu ý: Bạn phải cài đặt phần mềm 'curl' trên Windows 
                   (Windows 10/11 thường đã có sẵn).
                */
                bat "curl -X GET 'https://api.render.com/deploy/srv-xxxx?key=yyyy'"
            }
        }
    }
    
    post {
        success {
            echo '✅ Chúc mừng! Pipeline chạy thành công.'
        }
        failure {
            echo '❌ Toang rồi! Kiểm tra lại code hoặc cấu hình Jenkins.'
        }
    }
}