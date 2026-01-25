{
  description = "Python Dev Flake (Local Wheels + PyPI)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        
        # Версия Python
        python = pkgs.python313;

        # Путь к локальным колесам (через переменную окружения shell, не хардкод в nix)
        localWhlDir = "$HOME/Downloads/libs/python";

        # Библиотеки, необходимые для работы многих Python C-extensions (numpy, pandas, psycopg2 и т.д.)
        # Без этого pip install часто падает с ошибкой "library not found".
        runtimeLibs = with pkgs; [
          stdenv.cc.cc.lib
          zlib
          glib
          libGL
          libxkbcommon
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          name = "python-dev-env";
          
          buildInputs = [ 
            python 
            # Добавляем утилиты для сборки, если вдруг придется компилировать пакет
            pkgs.gcc 
            pkgs.pkg-config
            pkgs.chromium
            pkgs.chromedriver
          ] ++ runtimeLibs;

          # Магия для того, чтобы Python пакеты видели системные библиотеки NixOS
          LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath runtimeLibs}";

          shellHook = ''
            export CHROME_BIN=${pkgs.chromium}/bin/chromium
            # Сброс даты для корректной работы pip wheel (иногда ломается в Nix)
            unset SOURCE_DATE_EPOCH
            
            echo "🐍 Python Environment (2025) | Python ${python.version}"
            echo "📂 Wheel Source: ${localWhlDir}"

            # 1. Создаем venv
            if [ ! -d ".venv" ]; then
                echo "🚀 Creating virtual environment..."
                python -m venv .venv
            fi
            source .venv/bin/activate

            # 2. Функция установки зависимостей
            install_deps() {
                if [ -f "requirements.txt" ]; then
                    if [ -d "${localWhlDir}" ]; then
                        echo "📦 Installing from LOCAL WHEELS..."
                        # --no-index не используем, чтобы pip мог пойти в интернет, если локально пакета нет.
                        # Но --find-links имеет приоритет.
                        pip install --find-links="${localWhlDir}" -r requirements.txt
                    else
                        echo "🌐 Local libs not found. Installing from PyPI..."
                        pip install -r requirements.txt
                    fi
                fi
            }

            # Запускаем установку при входе (можно закомментировать, если раздражает)
            install_deps

            # --- АЛИАСЫ ---
            # Сохранить текущее состояние
            alias req-up="pip freeze > requirements.txt"
            
            # Скачать пакеты в локальную папку (кэширование)
            alias cache-up="pip download -d ${localWhlDir} -r requirements.txt"
            
            # Полный цикл обновления: сохранил -> скачал в архив -> переустановил
            alias pip-update="req-up && cache-up && install_deps"
            
            # Установка конкретного пакета с поиском в локальной папке
            # Пример: install pandas
            install() { pip install --find-links="$HOME/Downloads/libs/python" "$@"; }
          '';
        };

        apps.setup = {
          type = "app";
          program = toString (pkgs.writeShellScript "setup-project" ''
            mkdir -p src tests
            if [ ! -f "requirements.txt" ]; then
                touch requirements.txt
                echo "# Add your dependencies here" > requirements.txt
            fi
            
            # Создаем .gitignore
            if [ ! -f ".gitignore" ]; then
                echo ".venv/" >> .gitignore
                echo "__pycache__/" >> .gitignore
                echo ".env" >> .gitignore
            fi
            
            echo "✅ Project structure ready."
          '');
        };
      }
    );
}