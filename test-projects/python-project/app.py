from flask import Flask, render_template
from flask_babel import Babel, gettext as _

app = Flask(__name__)
babel = Babel(app)

@app.route('/')
def index():
    title = _('welcome.title')
    description = _('welcome.description')
    return render_template('index.html', title=title, description=description)

if __name__ == '__main__':
    app.run()