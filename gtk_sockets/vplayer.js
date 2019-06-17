const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const GdkX11 = imports.gi.GdkX11;
const Lang = imports.lang;

var CustomApplication = new Lang.Class ({
    Name: "CustomApplication",
    Extends: Gtk.Application,

    _init: function (args) {
        GLib.set_prgname ("custom-application");
        this.parent ({
            application_id: "org.konkor.template.application",
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("Custom GTK Application");
    },

    vfunc_startup: function() {
        this.parent();
        Gdk.set_allowed_backends ("x11");
        this.window = new Gtk.Window ();
        this.window.set_icon_name ("org.konkor.custom");
        this.add_window (this.window);
        this.build ();
        this.window.connect ("destroy", () => {
            this.socket.get_plug_window ().destroy ();
        });
    },

    vfunc_activate: function() {
        this.window.show_all ();
        this.window.present ();
    },

    build: function() {
        this.window.set_default_size (512, 320);
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (true);
        this.hb.get_style_context ().add_class ("hb");
        //this.window.set_titlebar (this.hb);
        this.layout = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        this.window.add (this.layout);
        this.socket = new Gtk.Socket ();
        this.layout.pack_start (this.socket, true, true, 0);
        
        this.id = this.socket.get_id ().toString();
        
        this.socket.connect ("plug-removed", Lang.bind (this, () => {
            this.quit ();
        }));
        this.window.show_all ();

        GLib.spawn_async (null, [GLib.find_program_in_path ("mplayer"),"-wid",this.id,
        "http://192.168.1.2:8088/0/test.mp4"],
        null, GLib.SpawnFlags.SEARCH_PATH, null);
        
    }
});

let app = new CustomApplication (ARGV);
app.run (ARGV);
