pipeline {
    agent any

    // Thêm block này để cấu hình NodeJS
    // LƯU Ý: Bạn phải vào Jenkins > Manage Jenkins > Tools 
    // Thêm cài đặt NodeJS và đặt tên chính xác là 'NodeJS' nhé.
    tools {
        nodejs 'NodeJS' 
    }

    stages {
        stage('Checkout') {
            steps {
                echo '🚚 Đang lấy code mới nhất từ GitHub...'
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

        stage('Dockerize & Deploy Local') {
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
            echo '✅ Xong! Bây giờ bạn có thể mở http://localhost:3000 để xem kết quả.'
        }
        failure {
            echo '❌ Có lỗi xảy ra trong quá trình Build hoặc Dockerize.'
        }
    }
}