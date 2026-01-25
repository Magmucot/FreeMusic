{
  description = "Python Dev Flake with Playwright";

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

        # Путь к локальным колесам
        localWhlDir = "$HOME/Downloads/libs/python";

        # Python окружение с Playwright из nixpkgs
        pythonEnv = python.withPackages (ps: with ps; [
          playwright
          requests
          python-dotenv
        ]);

        # Библиотеки для Python C-extensions + Playwright
        runtimeLibs = with pkgs; [
          stdenv.cc.cc.lib
          zlib glib libGL
          libxkbcommon
          # Дополнительные библиотеки для Playwright
          nspr nss
          at-spi2-atk
          cups libdrm
          gtk3 pango cairo
          mesa libxshmfence
          alsa-lib
          expat
          libxcomposite
          libxdamage
          libxfixes
          libxrandr
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          name = "python-playwright-env";
          
          buildInputs = [ 
            pythonEnv
            pkgs.gcc 
            pkgs.pkg-config
            pkgs.playwright-driver.browsers
          ] ++ runtimeLibs;

          # Playwright требует много системных библиотек
          LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath runtimeLibs}";

          # Указываем путь к браузерам Playwright
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

          shellHook = ''
            # Сброс даты для pip
            unset SOURCE_DATE_EPOCH
            
            echo "🐍 Python Environment with Playwright | Python ${python.version}"
            echo "📂 Wheel Source: ${localWhlDir}"
            echo "🎭 Playwright Browsers: $PLAYWRIGHT_BROWSERS_PATH"
            echo ""
            echo "⚠️  ВАЖНО: Playwright установлен через Nix (не pip)"
            echo "   Не устанавливайте playwright через pip!"

            # Создаем venv для дополнительных пакетов
            if [ ! -d ".venv" ]; then
                echo "🚀 Creating virtual environment..."
                python -m venv .venv --system-site-packages
            fi
            source .venv/bin/activate

            # Функция установки дополнительных зависимостей
            install_deps() {
                if [ -f "requirements.txt" ]; then
                    # Создаем временный requirements без playwright
                    grep -v "^playwright" requirements.txt > /tmp/requirements_tmp.txt || true
                    
                    if [ -s /tmp/requirements_tmp.txt ]; then
                        if [ -d "${localWhlDir}" ]; then
                            echo "📦 Installing additional packages from LOCAL WHEELS..."
                            pip install --find-links="${localWhlDir}" -r /tmp/requirements_tmp.txt
                        else
                            echo "🌐 Installing additional packages from PyPI..."
                            pip install -r /tmp/requirements_tmp.txt
                        fi
                    fi
                    rm -f /tmp/requirements_tmp.txt
                fi
            }

            # Запускаем установку при входе
            install_deps

            # --- АЛИАСЫ ---
            alias req-up="pip freeze > requirements.txt"
            alias cache-up="pip download -d ${localWhlDir} -r requirements.txt"
            alias pip-update="req-up && cache-up && install_deps"
            
            # Установка пакета с локальным поиском
            install() { 
                if [ "$1" = "playwright" ]; then
                    echo "❌ Не устанавливайте playwright через pip в NixOS!"
                    echo "   Он уже установлен через Nix"
                    return 1
                fi
                pip install --find-links="${localWhlDir}" "$@"
            }
            
            echo ""
            echo "💡 Полезные команды:"
            echo "   install <package>  - установка пакета"
            echo "   req-up            - сохранить зависимости"
            echo "   cache-up          - скачать в кэш"
            echo "   pip-update        - полное обновление"
            echo ""
            echo "🎭 Playwright готов к работе!"
          '';
        };
      }
    );
}