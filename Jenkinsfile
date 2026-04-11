pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                echo '🚚 Dang lay code moi nhat tu GitHub...'
                checkout scm
            }
        }
        // Bo qua stage Build & Test vi Docker se lam thay
        stage('Dockerize & Deploy') {
            steps {
                echo '🐳 Buoc 1: Dong goi Docker Image...'
                sh 'docker build -t doan-cnpm .'

                echo '🛑 Buoc 2: Don dep Container cu...'
                sh 'docker rm -f web-app-demo || true'

                echo '🚀 Buoc 3: Khoi chay ung dung...'
                sh 'docker run -d --name web-app-demo -p 3000:3000 doan-cnpm'
            }
        }
    }
    post {
        success {
            echo '✅ Da Deploy thanh cong!'
        }
        failure {
            echo '❌ Co loi xay ra trong qua trinh Build.'
        }
    }
}